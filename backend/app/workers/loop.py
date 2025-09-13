from time import sleep
from backend.app.db.session import SessionLocal
from backend.app.workers.jobs.expire_reservations import run as expire_run
from backend.app.services.notify.outbox_service import drain_whatsapp

def main(interval_seconds: int = 60):
    while True:
        s = SessionLocal()
        try:
            expired = expire_run(s)
            drained = drain_whatsapp(s, limit=50)
            print({"expired": expired, **drained})
        except Exception as e:
            print({"worker_error": str(e)})
        finally:
            s.close()
        sleep(interval_seconds)

if __name__ == "__main__":
    main()
