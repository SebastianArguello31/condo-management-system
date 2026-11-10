# Valida la configuración del enlace de recuperación y envía el correo por SMTP.
# La conexión usa STARTTLS antes de autenticar al remitente y entregar el mensaje.
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode, urlsplit

from flask import current_app, render_template

def validate_reset_mail_config():
    config = current_app.config

    if not config.get("SMTP_HOST") or not config.get("SMTP_FROM"):
        raise RuntimeError("Debes configurar SMTP_HOST y SMTP_FROM")

    url = config.get("PASSWORD_RESET_URL", "")
    parsed = urlsplit(url)

    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise RuntimeError("PASSWORD_RESET_URL no es válida")

    if parsed.username or parsed.password or parsed.query:
        raise RuntimeError("PASSWORD_RESET_URL no es válida")

    if parsed.fragment != "/restablecer-password":
        raise RuntimeError(
            "PASSWORD_RESET_URL debe terminar en "
            "#/restablecer-password"
        )

    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1",}:
        raise RuntimeError("PASSWORD_RESET_URL debe usar HTTPS fuera de localhost")

    username = config.get("SMTP_USERNAME")
    password = config.get("SMTP_PASSWORD")

    if bool(username) != bool(password):
        raise RuntimeError("Configura SMTP_USERNAME y SMTP_PASSWORD juntos")

def send_password_reset_email(recipient, token):
    validate_reset_mail_config()
    config = current_app.config

    link = (
        config["PASSWORD_RESET_URL"]
        + "?"
        + urlencode({"token": token})
    )

    message = EmailMessage()
    message["Subject"] = "Recuperar tu contraseña"
    message["From"] = config["SMTP_FROM"]
    message["To"] = recipient
    message.set_content(
        "Recibimos una solicitud para restablecer tu contraseña.\n\n"
        f"Abre este enlace:\n{link}\n\n"
        "El enlace vence en 30 minutos y permite un solo uso.\n"
        "Si no solicitaste este cambio, puedes ignorar este correo.\n"
    )
    message.add_alternative(
        render_template("emails/password_reset.html", reset_link=link),
        subtype="html",
    )

    context = ssl.create_default_context()

    with smtplib.SMTP(
        config["SMTP_HOST"],
        config["SMTP_PORT"],
        timeout=config["SMTP_TIMEOUT"],
    ) as smtp:
        smtp.ehlo()
        smtp.starttls(context=context)
        smtp.ehlo()

        if config.get("SMTP_USERNAME"):
            smtp.login(
                config["SMTP_USERNAME"],
                config["SMTP_PASSWORD"],
            )

        refused = smtp.send_message(message)

        if refused:
            raise RuntimeError("El servidor rechazó el destinatario")
