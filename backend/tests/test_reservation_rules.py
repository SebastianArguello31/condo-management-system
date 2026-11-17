import unittest
from datetime import date, time, timedelta

from werkzeug.exceptions import Conflict, Forbidden

from app.modules.reservations import rules

class TestReservationRules(unittest.TestCase):
    def setUp(self):
        self.hoy = date(2030, 1, 10)
        self.ahora = {
            "hoy": self.hoy,
            "hora_actual": time(9),
        }

        self.datos = {
            "fecha": self.hoy + timedelta(days=1),
            "hora_inicio": time(10),
            "hora_fin": time(12),
            "cantidad_personas": 15,
        }

        self.espacio = {
            "activo": True,
            "capacidad": 20,
        }

        self.politica = {
            "hora_apertura": time(8),
            "hora_cierre": time(20),
            "duracion_max_horas": 2,
            "dias_anticipacion_min": 1,
            "dias_anticipacion_max": 30,
            "aforo_maximo": 15,
        }

        self.residente = {
            "id_usuario": 2,
            "rol": "RESIDENTE",
        }

        self.administrador = {
            "id_usuario": 1,
            "rol": "ADMIN",
        }

    def validar(self, datos=None, espacio=None):
        rules.validate_creation(
            self.datos if datos is None else datos,
            self.espacio if espacio is None else espacio,
            self.politica,
            self.ahora,
        )

    def test_acepta_limites_inclusivos(self):
        self.validar()

        self.validar({
            **self.datos,
            "fecha": self.hoy + timedelta(days=30),
            "hora_inicio": time(18),
            "hora_fin": time(20),
        })

    def test_rechaza_horarios_invalidos(self):
        casos = [
            {"hora_inicio": time(7), "hora_fin": time(9)},
            {"hora_inicio": time(19), "hora_fin": time(21)},
            {"hora_inicio": time(10), "hora_fin": time(10)},
            {"hora_inicio": time(12), "hora_fin": time(10)},
            {"hora_fin": time(12, 1)},
        ]

        for cambios in casos:
            with (
                self.subTest(cambios=cambios),
                self.assertRaises(Conflict),
            ):
                self.validar({**self.datos, **cambios})

    def test_rechaza_fechas_fuera_de_anticipacion(self):
        for dias in (-1, 0, 31):
            with (
                self.subTest(dias=dias),
                self.assertRaises(Conflict),
            ):
                self.validar({
                    **self.datos,
                    "fecha": self.hoy + timedelta(days=dias),
                })

    def test_rechaza_inactividad_y_aforo(self):
        for espacio in (
            {"activo": False, "capacidad": 20},
            {"activo": True, "capacidad": 14},
        ):
            with (
                self.subTest(espacio=espacio),
                self.assertRaises(Conflict),
            ):
                self.validar(espacio=espacio)

        with self.assertRaises(Conflict):
            self.validar({
                **self.datos,
                "cantidad_personas": 16,
            })

    def test_residente_no_confirma_ni_rechaza(self):
        reserva = {
            "id_usuario": 2,
            "estado": "PENDIENTE",
            "fecha": self.hoy,
            "hora_fin": time(12),
        }

        for estado in ("CONFIRMADA", "RECHAZADA"):
            with (
                self.subTest(estado=estado),
                self.assertRaises(Forbidden),
            ):
                rules.validate_status_change(
                    reserva,
                    estado,
                    self.residente,
                    self.ahora,
                )

        rules.validate_status_change(
            reserva,
            "CONFIRMADA",
            self.administrador,
            self.ahora,
        )

    def test_cancelacion_antes_y_despues_del_fin(self):
        reserva = {
            "id_usuario": 2,
            "estado": "CONFIRMADA",
            "fecha": self.hoy,
            "hora_fin": time(12),
        }

        rules.validate_status_change(
            reserva,
            "CANCELADA",
            self.residente,
            {
                "hoy": self.hoy,
                "hora_actual": time(11, 59),
            },
        )

        for hora in (time(12), time(12, 1)):
            with (
                self.subTest(hora=hora),
                self.assertRaises(Conflict),
            ):
                rules.validate_status_change(
                    reserva,
                    "CANCELADA",
                    self.residente,
                    {"hoy": self.hoy, "hora_actual": hora},
                )

    def test_estados_terminales_no_se_reabren(self):
        for origen in ("CANCELADA", "RECHAZADA", "FINALIZADA"):
            for destino in ("PENDIENTE", "CONFIRMADA", "CANCELADA"):
                with self.subTest(origen=origen, destino=destino):
                    self.assertFalse(
                        rules.is_transition_allowed(
                            origen,
                            destino,
                        )
                    )