from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import os, json, uuid, time, contextlib
import psycopg

router = APIRouter()

# Use the same DSN source you used for enqueue
DSN = os.getenv("DATABASE_URL") or os.getenv("PG_DSN") or "postgresql://app:app@127.0.0.1:5433/app"

WA_PROVIDER = os.getenv("WA_PROVIDER", "noop").lower()      # "noop" | "pywhatkit"
WA_MAX_ATTEMPTS = int(os.getenv("WA_MAX_ATTEMPTS", "5"))
PK_WAIT = int(os.getenv("WA_PYWHATKIT_WAIT", "10"))         # seconds WhatsApp tab is allowed to work

def _send_noop(to: str, message: str) -> None:
    # Pretend we sent it (useful for dev)
    print(f"[WA NOOP] to={to} bytes={len(message)}")

def _send_pywhatkit(to: str, message: str) -> None:
    # Needs a desktop session logged in to WhatsApp Web
    import pywhatkit
    # instantly -> opens web.whatsapp.com in the default browser
    pywhatkit.sendwhatmsg_instantly(to, message, wait_time=PK_WAIT, tab_close=True, close_time=3)
    # a tiny pause so the browser has time to send
    time.sleep(2)

def _send_wa(to: str, message: str) -> None:
    if WA_PROVIDER == "pywhatkit":
        _send_pywhatkit(to, message)
    else:
        _send_noop(to, message)

@router.post("/drain")
def drain(limit: int = Query(10, ge=1, le=100)):
    """
    Pull up to `limit` queued messages, try to send each once.
    - On success: status=sent, sent_at=now(), attempts++
    - On error: if attempts+1 >= WA_MAX_ATTEMPTS -> status=failed, else back to queued, attempts++, last_error
    Returns counts.
    """
    taken = sent = requeued = failed = 0
    batch: list[tuple[str, str, str, int]] = []  # (id, to, message, attempts)

    with psycopg.connect(DSN) as conn:
        # 1) Lock a batch of queued rows so multiple drain calls won't collide
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id::text, "to", message, COALESCE(attempts, 0)
                FROM wa_outbox
                WHERE status = 'queued'
                ORDER BY created_at
                FOR UPDATE SKIP LOCKED
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall() or []
            taken = len(rows)

            # mark them as "sending" & bump attempts now to avoid double-processing if we crash mid-send
            ids = [r[0] for r in rows]
            if ids:
                cur.execute(
                    """
                    UPDATE wa_outbox
                    SET status='sending', attempts=COALESCE(attempts,0)+1, updated_at=now()
                    WHERE id = ANY(%s)
                    """,
                    (ids,),
                )

            batch = [(r[0], r[1], r[2], int(r[3])) for r in rows]

        # 2) Send each and update status individually
        for msg_id, to, message, prev_attempts in batch:
            try:
                _send_wa(to, message)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE wa_outbox
                        SET status='sent', sent_at=now(), last_error=NULL, updated_at=now()
                        WHERE id=%s
                        """,
                        (msg_id,),
                    )
                sent += 1
            except Exception as e:
                # decide whether to fail permanently or requeue
                attempts_now = prev_attempts + 1
                status_next = "failed" if attempts_now >= WA_MAX_ATTEMPTS else "queued"
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE wa_outbox
                        SET status=%s, last_error=%s, updated_at=now()
                        WHERE id=%s
                        """,
                        (status_next, str(e), msg_id),
                    )
                if status_next == "failed":
                    failed += 1
                else:
                    requeued += 1

        # commit all updates
        conn.commit()

    return {"taken": taken, "sent": sent, "requeued": requeued, "failed": failed, "provider": WA_PROVIDER}


def build_dsn() -> str:
    # Prefer a single DATABASE_URL-like var
    raw = (
        os.environ.get("DATABASE_URL")
        or os.environ.get("POSTGRES_DSN")
        or os.environ.get("PG_DSN")
        or ""
    )

    # If it looks like an SQLAlchemy URL, normalize it
    if raw.startswith("postgresql+"):
        # handle common variants
        raw = raw.replace("postgresql+psycopg://", "postgresql://")
        raw = raw.replace("postgresql+asyncpg://", "postgresql://")

    if raw:
        return raw

    # Assemble from discrete PG* vars if no single URL is provided
    host = os.environ.get("PGHOST", "127.0.0.1")
    port = os.environ.get("PGPORT", "5432")
    user = os.environ.get("PGUSER", "postgres")
    pwd  = os.environ.get("PGPASSWORD", "postgres")
    db   = os.environ.get("PGDATABASE", "eltafawook")
    return f"postgresql://{user}:{pwd}@{host}:{port}/{db}"

DSN = build_dsn()

class EnqueueBody(BaseModel):
    to: str = Field(min_length=5)
    message: str = Field(min_length=1)
    tags: Optional[Dict[str, Any]] = None

@router.post("/enqueue")
def enqueue(b: EnqueueBody):
    if not b.to or not b.message:
        raise HTTPException(status_code=400, detail="to and message required")

    try:
        with psycopg.connect(DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO wa_outbox (id, "to", message, tags, status, created_at)
                    VALUES (%s, %s, %s, %s, 'queued', now())
                    RETURNING id::text
                    """,
                    (str(uuid.uuid4()), b.to, b.message, json.dumps(b.tags or {})),
                )
                row: Optional[tuple[str]] = cur.fetchone()  # fetchone() can be None
                if row is None:
                    # extremely unlikely with RETURNING, but keeps Pylance and runtime safe
                    raise HTTPException(status_code=500, detail="INSERT returned no id")
                (out_id,) = row  # tuple-unpack is type-safe

        return {"id": out_id, "status": "queued"}
    except psycopg.Error as e:
        # Better surfaced DB error
        diag = getattr(e, "diag", None)
        primary = getattr(diag, "message_primary", None)
        detail = getattr(diag, "message_detail", None)
        msg = primary or str(e)
        if detail:
            msg = f"{msg} | {detail}"
        raise HTTPException(status_code=500, detail=f"DB error: {msg}")
