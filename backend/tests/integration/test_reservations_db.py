from concurrent.futures import ThreadPoolExecutor
from datetime import time

from werkzeug.exceptions import Conflict

from tests.integration.support import DatabaseCase
from app.modules.reservations import services as reservas

class TestReservationsDatabase(DatabaseCase):
    def test_dos_solicitudes_mismo_horario(self):
        def solicitar():
            try:
                self.crear_reserva()
                return "creada"
            except Conflict:
                return "conflicto"

        self.assertCountEqual(
            self.paralelas(solicitar, solicitar),
            ["creada", "conflicto"],
        )

        self.assertEqual(
            self.consultar("SELECT count(*) FROM reservas")[0][0],
            1,
        )

    def test_horarios_consecutivos(self):
        self.crear_reserva()
        self.crear_reserva(
            hora_inicio=time(12),
            hora_fin=time(14),
        )

        self.assertEqual(
            self.consultar("SELECT count(*) FROM reservas")[0][0],
            2,
        )

    def test_cancelar_libera_horario(self):
        primera = self.crear_reserva()

        reservas.update_reservation_status(
            primera["id_reserva"],
            "CANCELADA",
            self.residente,
        )

        segunda = self.crear_reserva()

        self.assertNotEqual(
            primera["id_reserva"],
            segunda["id_reserva"],
        )

    def test_otro_espacio_no_espera_el_bloqueo(self):
        segundo = self.crear_espacio()
        conexion = self.conectar()

        try:
            with conexion.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 1 FROM espacios_comunes
                    WHERE id_espacio_comun=%s
                    FOR UPDATE
                    """,
                    (self.espacio,),
                )

            def solicitar():
                with self.aplicacion.app_context():
                    return self.crear_reserva(id_espacio=segundo)

            with ThreadPoolExecutor(max_workers=1) as ejecutor:
                resultado = ejecutor.submit(solicitar).result(
                    timeout=15
                )

            self.assertEqual(
                resultado["id_espacio_comun"],
                segundo,
            )
        finally:
            conexion.rollback()
            conexion.close()

    def test_listado_filtrado(self):
        self.crear_reserva()

        resultado = reservas.list_reservations(self.residente)

        self.assertEqual(len(resultado), 1)
        self.assertEqual(
            resultado[0]["id_usuario"],
            self.residente["id_usuario"],
        )