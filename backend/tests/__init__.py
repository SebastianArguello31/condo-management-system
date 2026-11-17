"""Suite aislada: nunca abre conexiones reales, incluso con un .env local."""
from unittest.mock import patch


class ExternalConnectionError(BaseException):
    """No puede ser ocultado por manejadores HTTP de Exception."""


def reject_connection(*args, **kwargs):
    raise ExternalConnectionError(
        "Los tests no permiten conexiones externas; sustituye el repositorio por un mock"
    )


# Se instalan antes de importar la aplicación durante unittest discovery.
# Permanecen activos durante toda la vida del proceso de pruebas.
_guards = [
    patch("psycopg2.connect", side_effect=reject_connection),
    patch("socket.socket.connect", side_effect=reject_connection),
    patch("socket.socket.connect_ex", side_effect=reject_connection),
]
for _guard in _guards:
    _guard.start()
