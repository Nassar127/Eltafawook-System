from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.models.user import User
from backend.app.core.security import verify_password

def get_user_by_username(db: Session, username: str) -> User | None:
    """Fetches a user by their username."""
    return db.execute(select(User).where(User.username == username)).scalar_one_or_none()

def authenticate_user(db: Session, *, username: str, password: str) -> User | None:
    db_user = get_user_by_username(db, username=username)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user