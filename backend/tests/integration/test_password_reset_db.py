from unittest.mock import patch

from werkzeug.exceptions import BadRequest

from app.core.security import verify_password
from app.modules.auth import password_reset
from tests.integration.support import DatabaseCase


class TestPasswordResetDatabase(DatabaseCase):
    def create_reset(self):
        return password_reset.create_password_reset(
            "  RESIDENTE@example.com  "
        )

    def stored_password(self):
        return self.consultar(
            """
            SELECT password_hash
            FROM usuarios
            WHERE id_usuario = %s
            """,
            (self.residente["id_usuario"],),
        )[0][0]

    def test_guarda_hash_y_no_token_original(self):
        result = self.create_reset()

        rows = self.consultar(
            """
            SELECT token_hash, usado_en, expira_en > creado_en
            FROM recuperaciones_password
            WHERE id_usuario = %s
            """,
            (self.residente["id_usuario"],),
        )

        self.assertEqual(len(result["token"]), 43)
        self.assertEqual(
            rows[0][0],
            password_reset.digest_token(result["token"]),
        )
        self.assertNotEqual(rows[0][0], result["token"])
        self.assertIsNone(rows[0][1])
        self.assertTrue(rows[0][2])

    def test_correo_desconocido_o_inactivo_no_crea_token(self):
        self.assertIsNone(
            password_reset.create_password_reset(
                "inexistente@example.com"
            )
        )

        self.consultar(
            "UPDATE usuarios SET activo = FALSE WHERE id_usuario = %s",
            (self.residente["id_usuario"],),
        )

        self.assertIsNone(self.create_reset())

        count = self.consultar(
            "SELECT count(*) FROM recuperaciones_password"
        )[0][0]

        self.assertEqual(count, 0)

    def test_cambia_password_e_invalida_todos_los_enlaces(self):
        first = self.create_reset()
        second = self.create_reset()
        new_password = "Clave-nueva-456"

        password_reset.reset_password(first["token"], new_password)

        self.assertTrue(
            verify_password(new_password, self.stored_password())
        )
        self.assertFalse(
            verify_password("Clave-pruebas-123", self.stored_password())
        )

        for token in (first["token"], second["token"]):
            with self.subTest(token=token):
                with self.assertRaises(BadRequest):
                    password_reset.reset_password(
                        token,
                        "Otra-clave-789",
                    )

    def test_rechaza_token_vencido_sin_cambiar_password(self):
        result = self.create_reset()
        previous = self.stored_password()

        self.consultar(
            """
            UPDATE recuperaciones_password
            SET creado_en = clock_timestamp() - interval '2 hours',
                expira_en = clock_timestamp() - interval '1 hour'
            WHERE token_hash = %s
            """,
            (password_reset.digest_token(result["token"]),),
        )

        with self.assertRaises(BadRequest):
            password_reset.reset_password(
                result["token"],
                "Clave-nueva-456",
            )

        self.assertEqual(previous, self.stored_password())

    def test_rechaza_token_desconocido(self):
        with self.assertRaises(BadRequest):
            password_reset.reset_password(
                "z" * 43,
                "Clave-nueva-456",
            )

    def test_rechaza_cuenta_desactivada_despues_de_solicitar(self):
        result = self.create_reset()
        previous = self.stored_password()

        self.consultar(
            "UPDATE usuarios SET activo = FALSE WHERE id_usuario = %s",
            (self.residente["id_usuario"],),
        )

        with self.assertRaises(BadRequest):
            password_reset.reset_password(
                result["token"],
                "Clave-nueva-456",
            )

        self.assertEqual(previous, self.stored_password())

    def test_fallo_revierte_password_y_consumo_del_token(self):
        result = self.create_reset()
        previous = self.stored_password()

        with patch.object(
            password_reset.repository,
            "invalidate_pending_tokens",
            side_effect=RuntimeError("Fallo simulado"),
        ):
            with self.assertRaises(RuntimeError):
                password_reset.reset_password(
                    result["token"],
                    "Clave-nueva-456",
                )

        self.assertEqual(previous, self.stored_password())

        # El token sigue disponible porque la transacción se revirtió.
        password_reset.reset_password(
            result["token"],
            "Clave-final-789",
        )

        self.assertTrue(
            verify_password("Clave-final-789", self.stored_password())
        )

    def test_dos_intentos_simultaneos_solo_permiten_un_exito(self):
        result = self.create_reset()

        def attempt():
            try:
                password_reset.reset_password(
                    result["token"],
                    "Clave-nueva-456",
                )
                return True
            except BadRequest:
                return False

        results = self.paralelas(attempt, attempt)

        self.assertEqual(sorted(results), [False, True])