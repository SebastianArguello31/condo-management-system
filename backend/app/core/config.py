# Carga el archivo .env del proyecto y expone la configuración de Flask.
# Agrupa conexión a PostgreSQL, Redis, sesiones JWT y entrega de correo SMTP.
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_HOURS = int(os.getenv("JWT_ACCESS_TOKEN_HOURS", "2"))

    DEBUG = False
    BACKEND_PORT = int(os.getenv("BACKEND_PORT", "5000"))
    FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "4000"))

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")

    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0",)
    RATELIMIT_STORAGE_URI = REDIS_URL

    PASSWORD_RESET_URL = os.getenv(
        "PASSWORD_RESET_URL",
        "http://localhost:4000/#/restablecer-password",
    )

    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "")
    SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", "10"))