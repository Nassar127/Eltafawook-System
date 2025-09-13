from apscheduler.schedulers.background import BackgroundScheduler
from backend.app.db.session import SessionLocal
from backend.app.workers.jobs.expire_reservations import run as expire_run

def start() -> BackgroundScheduler:
    sched = BackgroundScheduler(timezone="UTC")

    def _expire_job():
        db = SessionLocal()
        try:
            expire_run(db)
        finally:
            db.close()

    sched.add_job(
        _expire_job,
        trigger="interval",
        minutes=1,
        id="expire_reservations",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    sched.start()
    return sched
