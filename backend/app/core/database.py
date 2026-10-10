import atexit
import psycopg2

from threading import Lock

from flask import current_app
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

def get_connection_params():
    config = current_app.config

    return {
        "host": config["DB_HOST"],
        "port": config["DB_PORT"],
        "dbname": config["DB_NAME"],
        "user": config["DB_USER"],
        "password": config["DB_PASSWORD"],
        "connect_timeout": config["DB_CONNECT_TIMEOUT"],
        "application_name": "condo-management-system",
    }

def init_db(app):
    if "database" in app.extensions:
        return

    app.extensions["database"] = {
        "pool": None,
        "lock": Lock(),
    }

    atexit.register(close_db, app)

def get_pool():
    state = current_app.extensions.get("database")

    if state is None:
        raise RuntimeError("La base de datos no fue inicializada")

    with state["lock"]:
        if state["pool"] is None:
            state["pool"] = ThreadedConnectionPool(
                minconn=current_app.config["DB_POOL_MIN"],
                maxconn=current_app.config["DB_POOL_MAX"],
                **get_connection_params(),
            )

        return state["pool"]

def close_db(app):
    state = app.extensions.get("database")

    if state is None:
        return

    with state["lock"]:
        if state["pool"] is not None:
            state["pool"].closeall()
            state["pool"] = None

def get_connection():
    return psycopg2.connect(**get_connection_params())

def get_cursor(connection):
    return connection.cursor(cursor_factory=RealDictCursor)