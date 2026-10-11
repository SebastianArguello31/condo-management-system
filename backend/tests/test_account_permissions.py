import unittest
from unittest.mock import patch

from werkzeug.exceptions import BadRequest, Forbidden

from app.modules.users.services import accounts

class TestAccountPermissions(unittest.TestCase):
    def setUp(self):
        transaccion = patch.object(accounts, "transaction")
        transaccion.start()
        self.addCleanup(transaccion.stop)

        bloqueo = patch.object(
            accounts.accounts_repo,
            "lock_users",
            return_value={
                1: {
                    "id_usuario": 1,
                    "rol": "ADMIN",
                    "activo": True,
                },
                2: {
                    "id_usuario": 2,
                    "rol": "RESIDENTE",
                    "activo": True,
                },
            },
        )

        self.bloquear = bloqueo.start()
        self.addCleanup(bloqueo.stop)

    def test_no_puede_desactivarse(self):
        with patch.object(accounts, "save_account") as guardar:
            with self.assertRaises(BadRequest):
                accounts.update_managed_account(
                    1,
                    {"activo": False},
                    1,
                    access_only=True,
                )

            guardar.assert_not_called()

    def test_no_puede_eliminarse(self):
        with patch.object(
            accounts.accounts_repo,
            "delete_user",
        ) as eliminar:
            with self.assertRaises(BadRequest):
                accounts.delete_account(1, 1)

            eliminar.assert_not_called()

    def test_revalida_administrador_desactivado(self):
        self.bloquear.return_value[1]["activo"] = False

        with patch.object(accounts, "save_account") as guardar:
            with self.assertRaises(Forbidden):
                accounts.update_managed_account(
                    2,
                    {"activo": False},
                    1,
                )

            guardar.assert_not_called()

    def test_rechaza_escalamiento_de_rol(self):
        with self.assertRaises(BadRequest):
            accounts.prepare_account_data({"id_rol": 1})

        with self.assertRaises(BadRequest):
            accounts.update_managed_account(
                2,
                {"email": "otro@example.com"},
                1,
                access_only=True,
            )

        self.bloquear.assert_not_called()

    def test_permite_desactivar_otra_cuenta(self):
        with patch.object(
            accounts,
            "save_account",
            return_value={
                "id_usuario": 2,
                "activo": False,
            },
        ) as guardar:
            resultado = accounts.update_managed_account(
                2,
                {"activo": False},
                1,
                access_only=True,
            )

        self.assertFalse(resultado["activo"])
        guardar.assert_called_once()