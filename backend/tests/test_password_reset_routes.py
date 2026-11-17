import unittest
from unittest.mock import patch

from redis.exceptions import ConnectionError as RedisConnectionError
from werkzeug.exceptions import BadRequest

from app import create_app
from app.modules.auth import routes

class TestPasswordResetRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "JWT_SECRET_KEY": "secreto-de-tests-con-mas-de-32-caracteres",
            "JWT_ACCESS_TOKEN_HOURS": 2,
            "RATELIMIT_STORAGE_URI": "memory://",
            "RATELIMIT_ENABLED": True,
        })
        self.client = self.app.test_client()

    def test_solicitud_encola_correo_normalizado_sin_exponer_token(self):
        with patch.object(routes, "enqueue_password_reset") as enqueue:
            response = self.client.post(
                "/condominio/auth/forgot-password",
                json={"email": "  PERSONA@example.com  "},
            )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(
            response.get_json(),
            {"message": routes.RECOVERY_MESSAGE},
        )
        enqueue.assert_called_once_with("persona@example.com")

    def test_correo_invalido_no_encola_trabajo(self):
        with patch.object(routes, "enqueue_password_reset") as enqueue:
            response = self.client.post(
                "/condominio/auth/forgot-password",
                json={"email": "incorrecto"},
            )

        self.assertEqual(response.status_code, 400)
        enqueue.assert_not_called()

    def test_cola_no_disponible_devuelve_error(self):
        with patch.object(
            routes,
            "enqueue_password_reset",
            side_effect=RedisConnectionError("No disponible"),
        ):
            response = self.client.post(
                "/condominio/auth/forgot-password",
                json={"email": "persona@example.com"},
            )

        self.assertEqual(response.status_code, 503)

    def test_limite_por_correo_funciona_desde_distintas_ips(self):
        with patch.object(routes, "enqueue_password_reset") as enqueue:
            responses = [
                self.client.post(
                    "/condominio/auth/forgot-password",
                    json={"email": "persona@example.com"},
                    environ_overrides={
                        "REMOTE_ADDR": f"192.0.2.{index + 1}",
                    },
                )
                for index in range(4)
            ]

        self.assertEqual(
            [response.status_code for response in responses],
            [202, 202, 202, 429],
        )
        self.assertEqual(enqueue.call_count, 3)

    def test_limite_por_ip_funciona_con_distintos_correos(self):
        with patch.object(routes, "enqueue_password_reset") as enqueue:
            responses = [
                self.client.post(
                    "/condominio/auth/forgot-password",
                    json={"email": f"persona{index}@example.com"},
                )
                for index in range(6)
            ]

        self.assertEqual(
            [response.status_code for response in responses],
            [202, 202, 202, 202, 202, 429],
        )
        self.assertEqual(enqueue.call_count, 5)

    def test_restablecimiento_delega_en_el_servicio(self):
        with patch.object(routes, "reset_password") as reset:
            response = self.client.post(
                "/condominio/auth/reset-password",
                json={
                    "token": "a" * 43,
                    "password": "Clave-nueva-123",
                },
            )

        self.assertEqual(response.status_code, 200)
        reset.assert_called_once_with(
            "a" * 43,
            "Clave-nueva-123",
        )

    def test_token_rechazado_devuelve_400(self):
        with patch.object(
            routes,
            "reset_password",
            side_effect=BadRequest("Enlace inválido o vencido"),
        ):
            response = self.client.post(
                "/condominio/auth/reset-password",
                json={
                    "token": "a" * 43,
                    "password": "Clave-nueva-123",
                },
            )

        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()