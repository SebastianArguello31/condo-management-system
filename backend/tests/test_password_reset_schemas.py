import unittest

from marshmallow import ValidationError

from app.modules.auth.schemas import (
    ForgotPasswordSchema,
    ResetPasswordSchema,
)


class TestPasswordResetSchemas(unittest.TestCase):
    def setUp(self):
        self.token = "a" * 43

    def test_solicitud_elimina_espacios_del_correo(self):
        result = ForgotPasswordSchema().load({
            "email": "  persona@example.com  ",
        })

        self.assertEqual(result["email"], "persona@example.com")

    def test_solicitud_rechaza_correo_invalido_o_ausente(self):
        for payload in ({}, {"email": "incorrecto"}, {"email": None}):
            with self.subTest(payload=payload):
                with self.assertRaises(ValidationError):
                    ForgotPasswordSchema().load(payload)

    def test_restablecimiento_conserva_espacios_de_password(self):
        password = "  Mi clave nueva  "

        result = ResetPasswordSchema().load({
            "token": self.token,
            "password": password,
        })

        self.assertEqual(result["password"], password)

    def test_restablecimiento_rechaza_token_invalido(self):
        for token in ("", "a" * 42, "a" * 44, "!" * 43, None):
            with self.subTest(token=token):
                with self.assertRaises(ValidationError):
                    ResetPasswordSchema().load({
                        "token": token,
                        "password": "Nueva-clave-123",
                    })

    def test_restablecimiento_exige_ambos_campos(self):
        payloads = (
            {},
            {"token": self.token},
            {"password": "Nueva-clave-123"},
        )

        for payload in payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(ValidationError):
                    ResetPasswordSchema().load(payload)

    def test_restablecimiento_rechaza_password_invalida(self):
        for password in ("a" * 7, "é" * 37, None):
            with self.subTest(password=password):
                with self.assertRaises(ValidationError):
                    ResetPasswordSchema().load({
                        "token": self.token,
                        "password": password,
                    })

    def test_restablecimiento_acepta_limite_de_72_bytes(self):
        password = "é" * 36

        result = ResetPasswordSchema().load({
            "token": self.token,
            "password": password,
        })

        self.assertEqual(result["password"], password)


if __name__ == "__main__":
    unittest.main()