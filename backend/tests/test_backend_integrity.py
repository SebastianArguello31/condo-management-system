import re
import unittest
from datetime import date, time
from io import BytesIO
from unittest.mock import patch

from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import BadRequest, Conflict, Forbidden

from app import create_app
from app.core.security import create_access_token
from app.modules.incidents.attachments import prepare_files
from app.modules.incidents.rules import validate_transition
from app.modules.reservations.rules import (
    get_user_filter,
    validate_access,
    validate_creation,
)


class TestBackendIntegrity(unittest.TestCase):
    def setUp(self):
        self.aplicacion = create_app({
            "TESTING": True,
            "JWT_SECRET_KEY": "clave-exclusiva-de-pruebas-no-produccion",
            "JWT_ACCESS_TOKEN_HOURS": 2,
        })
        self.cliente = self.aplicacion.test_client()

        self.bloqueo = patch(
            "app.core.db_helpers.get_connection",
            side_effect=AssertionError(
                "Acceso inesperado a PostgreSQL"
            ),
        )
        self.bloqueo.start()
        self.addCleanup(self.bloqueo.stop)

    def cabeceras(self):
        with self.aplicacion.app_context():
            token = create_access_token(2)

        return {"Authorization": f"Bearer {token}"}

    def test_arranque(self):
        self.assertEqual(
            self.cliente.get("/").status_code,
            200,
        )

    def test_rutas_exigen_token(self):
        comprobaciones = 0

        for regla in self.aplicacion.url_map.iter_rules():
            if not regla.rule.startswith("/condominio"):
                continue

            if regla.rule == "/condominio/auth/login":
                continue

            ruta = re.sub(r"<[^>]+>", "1", regla.rule)

            for metodo in regla.methods - {"HEAD", "OPTIONS"}:
                with self.subTest(ruta=ruta, metodo=metodo):
                    respuesta = self.cliente.open(
                        ruta,
                        method=metodo,
                    )

                    self.assertEqual(
                        respuesta.status_code,
                        401,
                    )
                    self.assertIn(
                        "error",
                        respuesta.get_json(),
                    )

                    comprobaciones += 1

        self.assertGreater(comprobaciones, 0)

    def test_token_invalido(self):
        respuesta = self.cliente.get(
            "/condominio/auth/me",
            headers={"Authorization": "Bearer invalido"},
        )

        self.assertEqual(respuesta.status_code, 401)

    def test_usuario_desactivado(self):
        with patch(
            "app.core.decorators.get_user",
            return_value={
                "id_usuario": 2,
                "rol": "RESIDENTE",
                "activo": False,
            },
        ):
            respuesta = self.cliente.get(
                "/condominio/auth/me",
                headers=self.cabeceras(),
            )

        self.assertEqual(respuesta.status_code, 401)

    def test_residente_no_administra_usuarios(self):
        with patch(
            "app.core.decorators.get_user",
            return_value={
                "id_usuario": 2,
                "rol": "RESIDENTE",
                "activo": True,
            },
        ):
            respuesta = self.cliente.get(
                "/condominio/users",
                headers=self.cabeceras(),
            )

        self.assertEqual(respuesta.status_code, 403)

    def test_json_login_invalido(self):
        respuesta = self.cliente.post(
            "/condominio/auth/login",
            json=[],
        )

        self.assertEqual(respuesta.status_code, 400)

    def test_filtro_no_expone_otro_residente(self):
        usuario = {
            "id_usuario": 2,
            "rol": "RESIDENTE",
        }

        self.assertEqual(
            get_user_filter(usuario, 99),
            2,
        )

        with self.assertRaises(Forbidden):
            validate_access(
                {"id_usuario": 99},
                usuario,
            )

    def test_reserva_valida_y_aforo_excedido(self):
        datos = {
            "fecha": date(2026, 10, 12),
            "hora_inicio": time(10),
            "hora_fin": time(12),
            "cantidad_personas": 10,
        }

        espacio = {
            "activo": True,
            "capacidad": 20,
        }

        politica = {
            "hora_apertura": time(8),
            "hora_cierre": time(20),
            "duracion_max_horas": 2,
            "dias_anticipacion_min": 0,
            "dias_anticipacion_max": 30,
            "aforo_maximo": 15,
        }

        ahora = {
            "hoy": date(2026, 10, 11),
            "hora_actual": time(9),
        }

        validate_creation(
            datos,
            espacio,
            politica,
            ahora,
        )

        with self.assertRaises(Conflict):
            validate_creation(
                {**datos, "cantidad_personas": 16},
                espacio,
                politica,
                ahora,
            )

    def test_tecnico_solo_cierra_incidencia_propia_resuelta(self):
        incidencia = {
            "estado": "RESUELTA",
            "id_reportante": 2,
            "id_personal_asignado": 7,
        }

        validate_transition(
            incidencia,
            "CERRADA",
            {"id_usuario": 7, "rol": "TECNICO"},
        )

        with self.assertRaises(Forbidden):
            validate_transition(
                incidencia,
                "CERRADA",
                {"id_usuario": 8, "rol": "TECNICO"},
            )

    def test_rechaza_adjunto_con_firma_incorrecta(self):
        archivo = FileStorage(
            stream=BytesIO(b"contenido que no es PNG"),
            filename="imagen.png",
        )

        try:
            with self.assertRaises(BadRequest):
                prepare_files([archivo])
        finally:
            archivo.close()


if __name__ == "__main__":
    unittest.main()