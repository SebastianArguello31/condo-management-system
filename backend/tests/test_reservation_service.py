import unittest
from datetime import date, time
from unittest.mock import Mock, patch
from werkzeug.exceptions import Conflict, Forbidden, NotFound
from app.modules.reservations import services


class TestReservationService(unittest.TestCase):
    def setUp(self):
        self.transaction = self.enterContext(patch.object(services, "transaction"))
        self.cursor = self.transaction.return_value.__enter__.return_value
        self.context = self.enterContext(patch.object(services, "context_repo", autospec=True))
        self.repo = self.enterContext(patch.object(services, "reservation_repo", autospec=True))
        self.user = {"id_usuario": 7, "rol": "RESIDENTE"}
        self.data = {"id_espacio": 1, "id_tipo_evento": 2, "fecha": date(2030, 1, 2),
                     "hora_inicio": time(10), "hora_fin": time(12), "cantidad_personas": 10}
        self.context.lock_space.return_value = {"activo": True, "capacidad": 20}
        self.context.get_policy.return_value = {
            "hora_apertura": time(8), "hora_cierre": time(20), "duracion_max_horas": 4,
            "dias_anticipacion_min": 0, "dias_anticipacion_max": 30,
            "aforo_maximo": 15, "costo": 100,
        }
        self.context.get_status.return_value = {"id_estado_reserva": 3}
        self.context.get_current_time.return_value = {"hoy": date(2030, 1, 1), "hora_actual": time(9)}
        self.repo.has_overlap.return_value = False
        self.repo.insert_reservation.return_value = {"id_reserva": 42}
        self.repo.get_reservation.return_value = {"id_reserva": 42, "id_usuario": 7}

    def test_creation_locks_space_before_overlap_and_insert(self):
        calls = Mock()
        calls.attach_mock(self.context.lock_space, "lock")
        calls.attach_mock(self.repo.has_overlap, "overlap")
        calls.attach_mock(self.repo.insert_reservation, "insert")
        result = services.create_reservation(self.data, self.user)
        self.assertEqual(result, {"id_reserva": 42, "id_usuario": 7})
        self.assertEqual([call[0] for call in calls.mock_calls], ["lock", "overlap", "insert"])
        self.context.lock_space.assert_called_once_with(1, cursor=self.cursor)
        self.repo.insert_reservation.assert_called_once_with(self.data, 7, 100, 3, cursor=self.cursor)

    def test_overlap_does_not_insert(self):
        self.repo.has_overlap.return_value = True
        with self.assertRaises(Conflict):
            services.create_reservation(self.data, self.user)
        self.repo.insert_reservation.assert_not_called()

    def test_missing_context_rejects_without_insert(self):
        for method, error in (("lock_space", NotFound), ("get_resident_link", Forbidden),
                              ("get_active_event_type", Conflict), ("get_policy", Conflict),
                              ("get_status", Conflict)):
            with self.subTest(method=method):
                mock = getattr(self.context, method)
                previous = mock.return_value
                mock.return_value = None
                with self.assertRaises(error):
                    services.create_reservation(self.data, self.user)
                self.repo.insert_reservation.assert_not_called()
                mock.return_value = previous

    def test_excess_capacity_rejected_before_overlap_query(self):
        with self.assertRaises(Conflict):
            services.create_reservation({**self.data, "cantidad_personas": 16}, self.user)
        self.repo.has_overlap.assert_not_called()
        self.repo.insert_reservation.assert_not_called()

    def test_other_roles_cannot_create(self):
        for role in ("ADMIN", "GESTOR", "TECNICO"):
            with self.subTest(role=role), self.assertRaises(Forbidden):
                services.create_reservation(self.data, {**self.user, "rol": role})
        self.transaction.assert_not_called()

    def test_resident_list_cannot_be_redirected_to_another_user(self):
        self.repo.list_reservations.return_value = []
        self.assertEqual(services.list_reservations(self.user, resident_id=99), [])
        self.repo.list_reservations.assert_called_once_with(
            user_id=7, space=None, status=None, reservation_date=None, cursor=self.cursor,
        )
