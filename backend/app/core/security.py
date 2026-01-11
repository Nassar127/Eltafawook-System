import sys
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from backend.app.core.config import settings

# Setup password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    print(f"\n--- DEBUG: LOGIN ATTEMPT ---", flush=True)
    print(f"DEBUG: Plain password length: {len(plain_password)}", flush=True)
    print(f"DEBUG: Hash from Database:   {hashed_password}", flush=True)
    
    try:
        # Actually check the password
        is_valid = pwd_context.verify(plain_password, hashed_password)
        print(f"DEBUG: Library Verification Result: {is_valid}", flush=True)
        return is_valid
    except Exception as e:
        print(f"DEBUG: CRASH during verify: {e}", flush=True)
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)
    return encoded_jwt
