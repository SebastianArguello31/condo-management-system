import psycopg2
from flask import current_app
from psycopg2.extras import RealDictCursor

def get_connection():
    config = current_app.config
    return psycopg2.connect(
        host=config["DB_HOST"],
        port=config["DB_PORT"],
        dbname=config["DB_NAME"],
        user=config["DB_USER"],
        password=config["DB_PASSWORD"],
        connect_timeout=5,
    )

def get_cursor(connection):
    return connection.cursor(cursor_factory=RealDictCursor)