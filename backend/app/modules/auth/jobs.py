# Encola y procesa el envío asíncrono de enlaces de recuperación mediante RQ.
# El trabajo crea su propio contexto Flask para acceder a configuración y base de datos.
from flask import current_app
from redis import Redis
from rq import Queue

from app.core.mail import send_password_reset_email, validate_reset_mail_config
from app.modules.auth.password_reset import create_password_reset

def enqueue_password_reset(email):
    connection = Redis.from_url(
        current_app.config["REDIS_URL"],
        socket_connect_timeout=3,
        socket_timeout=3,
    )

    try:
        queue = Queue("password-reset", connection=connection)

        queue.enqueue(
            process_password_reset,
            email,
            description="Enviar recuperación de contraseña",
            job_timeout=120,
            ttl=300,
            result_ttl=0,
            failure_ttl=3600,
        )
    finally:
        connection.close()

def process_password_reset(email):
    from app import create_app

    app = create_app()

    with app.app_context():
        validate_reset_mail_config()

        recovery = create_password_reset(email)

        if recovery is None:
            return

        send_password_reset_email(
            recovery["email"],
            recovery["token"],
        )