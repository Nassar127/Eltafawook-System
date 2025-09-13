import os
from typing import Final
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "dev")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://app:app@localhost:5432/app",
    )
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    tz: str = os.getenv("TZ", "Africa/Cairo")
    wa_pywhatkit_enabled: bool = os.getenv("WA_PYWHATKIT_ENABLED", "false").lower() == "true"
    wa_queue_always: bool = bool(int(os.getenv("WA_QUEUE_ALWAYS", "1")))

_SETTINGS: Final[Settings] = Settings()

def get_settings() -> Settings:
    return _SETTINGS

settings: Settings = get_settings()
