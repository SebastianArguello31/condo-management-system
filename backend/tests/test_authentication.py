import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from flask import Flask
from marshmallow import ValidationError

from app.core import security
from app.modules.auth import services

class TestAuthentication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.hash_prueba = security.hash_password("Clave-prueba-123")

    def setUp(self):
        self.aplicacion = Flask(__name__)
        self.aplicacion.config.update(
            JWT_SECRET_KEY="secreto-de-tests-con-mas-de-32-caracteres",
            JWT_ACCESS_TOKEN_HOURS=2,
        )

        contexto = self.aplicacion.app_context()
        contexto.push()
        self.addCleanup(contexto.pop)

        self.usuario = {
            "id_usuario": 7,
            "email": "persona@example.com",
            "activo": True,
            "password_hash": self.hash_prueba,
        }

    def test_login_normaliza_correo_y_no_expone_hash(self):
        with patch.object(
            services,
            "get_login_user",
            return_value=self.usuario,
        ) as buscar:
            resultado = services.authenticate_user(
                "  PERSONA@example.com  ",
                "Clave-prueba-123",
            )

        buscar.assert_called_once_with("persona@example.com")
        self.assertNotIn("password_hash", resultado["user"])
        self.assertIn("password_hash", self.usuario)

        contenido = security.decode_access_token(
            resultado["access_token"]
        )
        self.assertEqual(contenido["sub"], "7")

    def test_login_rechaza_password_incorrecta(self):
        with patch.object(
            services,
            "get_login_user",
            return_value=self.usuario,
        ):
            self.assertIsNone(
                services.authenticate_user(
                    "persona@example.com",
                    "Incorrecta-123",
                )
            )

    def test_login_rechaza_usuario_inactivo(self):
        self.usuario["activo"] = False

        with patch.object(
            services,
            "get_login_user",
            return_value=self.usuario,
        ):
            self.assertIsNone(
                services.authenticate_user(
                    "persona@example.com",
                    "Clave-prueba-123",
                )
            )

    def test_login_desconocido_no_genera_token(self):
        with (
            patch.object(
                services,
                "get_login_user",
                return_value=None,
            ),
            patch.object(
                services,
                "create_access_token",
            ) as generar,
        ):
            self.assertIsNone(
                services.authenticate_user(
                    "nadie@example.com",
                    "Clave-prueba-123",
                )
            )
            generar.assert_not_called()

    def test_password_limite_en_bytes(self):
        with self.assertRaises(ValidationError):
            security.hash_password("a" * 7)

        with self.assertRaises(ValidationError):
            security.hash_password("é" * 37)

        self.assertFalse(
            security.verify_password("é" * 37, self.hash_prueba)
        )

    def test_rechaza_tokens_invalidos(self):
        ahora = datetime.now(timezone.utc)
        secreto = self.aplicacion.config["JWT_SECRET_KEY"]

        casos = [
            (
                {
                    "sub": "7",
                    "iat": ahora - timedelta(hours=2),
                    "exp": ahora - timedelta(hours=1),
                },
                secreto,
            ),
            (
                {"sub": "7", "iat": ahora},
                secreto,
            ),
            (
                {
                    "sub": "7",
                    "iat": ahora,
                    "exp": ahora + timedelta(hours=1),
                },
                "otro-secreto-de-tests-con-mas-de-32-caracteres",
            ),
        ]

        for contenido, clave in casos:
            with self.subTest(contenido=contenido, clave=clave):
                token = jwt.encode(
                    contenido,
                    clave,
                    algorithm="HS256",
                )

                with self.assertRaises(jwt.InvalidTokenError):
                    security.decode_access_token(token)