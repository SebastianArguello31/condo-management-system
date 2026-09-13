import psycopg2

from psycopg2.extras import RealDictCursor

from app.core.config import Config

def get_connection():
    return psycopg2.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        database=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD
    )

def get_cursor(connection):
    return connection.cursor(cursor_factory=RealDictCursor)
