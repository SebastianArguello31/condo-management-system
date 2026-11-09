import unittest
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from flask import Flask
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import BadRequest, Forbidden
from app.modules.incidents import services


class TestIncidentService(unittest.TestCase):
    def setUp(self):
        self.transaction = self.enterContext(patch.object(services, "transaction"))
        self.cursor = self.transaction.return_value.__enter__.return_value
        self.repo = self.enterContext(patch.object(services, "incident_repo", autospec=True))
        self.activity = self.enterContext(patch.object(services, "activity_repo", autospec=True))
        self.catalogs = self.enterContext(patch.object(services, "catalogs", autospec=True))
        self.files = self.enterContext(patch.object(services, "attachments_repo", autospec=True))
        self.directory = Path(self.enterContext(TemporaryDirectory()))
        app = Flask(__name__)
        app.config["INCIDENT_UPLOAD_DIR"] = str(self.directory)
        self.enterContext(app.app_context())
        self.user = {"id_usuario": 2, "rol": "RESIDENTE"}
        self.admin = {"id_usuario": 1, "rol": "ADMIN"}
        self.data = {"id_unidad": 4, "id_tipo_incidencia": 5,
                     "titulo": "Fuga", "descripcion": "Fuga de agua en la cocina"}
        self.incident = {"id_incidencia": 10, "id_reportante": 2,
                         "id_personal_asignado": 3, "estado": "EN_PROCESO"}
        self.repo.insert_incident.return_value = {"id_incidencia": 10}
        self.repo.get_context.return_value = dict(self.incident)
        self.repo.get_incident.return_value = dict(self.incident)
        self.catalogs.get_status.return_value = {"id_estados_incidencia": 6, "nombre": "RESUELTA"}
        self.files.list_attachments.return_value = []

    def attachment(self):
        file = FileStorage(stream=BytesIO(b"%PDF-1.4\ncontenido"), filename="prueba.pdf")
        self.addCleanup(file.close)
        return file

    def test_creation_saves_attachment_and_history_with_same_cursor(self):
        result = services.create_incident(self.data, [self.attachment()], self.user)
        self.assertEqual(result, {"id_incidencia": 10, "estado": "RECIBIDA"})
        paths = list(self.directory.iterdir())
        self.assertEqual(len(paths), 1)
        self.assertEqual(paths[0].read_bytes(), b"%PDF-1.4\ncontenido")
        self.activity.record_status.assert_called_once_with(10, 6, 2, cursor=self.cursor)
        args, kwargs = self.files.insert_attachment.call_args
        self.assertEqual(args[:2], (10, 2))
        self.assertEqual(args[2]["stored_name"], paths[0].name)
        self.assertEqual(kwargs, {"cursor": self.cursor})

    def test_attachment_insert_failure_removes_written_file(self):
        failure = RuntimeError("attachment insert failed")
        self.files.insert_attachment.side_effect = failure
        with self.assertRaises(RuntimeError) as raised:
            services.create_incident(self.data, [self.attachment()], self.user)
        self.assertIs(raised.exception, failure)
        self.assertEqual(list(self.directory.iterdir()), [])
        self.assertEqual(self.transaction.return_value.__exit__.call_args.args[:2], (RuntimeError, failure))

    def test_commit_failure_also_removes_written_file(self):
        self.transaction.return_value.__exit__.side_effect = RuntimeError("commit failed")
        with self.assertRaises(RuntimeError):
            services.create_incident(self.data, [self.attachment()], self.user)
        self.files.insert_attachment.assert_called_once()
        self.assertEqual(list(self.directory.iterdir()), [])

    def test_unlinked_unit_cannot_create_incident_or_file(self):
        self.repo.get_resident_link.return_value = None
        with self.assertRaises(Forbidden):
            services.create_incident(self.data, [self.attachment()], self.user)
        self.repo.insert_incident.assert_not_called()
        self.files.insert_attachment.assert_not_called()
        self.assertEqual(list(self.directory.iterdir()), [])

    def test_invalid_transition_does_not_write_date_or_history(self):
        self.catalogs.get_status.return_value["nombre"] = "RECIBIDA"
        with self.assertRaises(BadRequest):
            services.update_status(10, {"estado": "RECIBIDA"}, self.admin)
        self.repo.update_resolution_date.assert_not_called()
        self.activity.record_status.assert_not_called()

    def test_history_failure_reaches_same_transaction_as_resolution_date(self):
        failure = RuntimeError("history failed")
        self.activity.record_status.side_effect = failure
        with self.assertRaises(RuntimeError):
            services.update_status(10, {"estado": "RESUELTA"}, self.admin)
        self.repo.lock_incident.assert_called_once_with(10, for_update=True, cursor=self.cursor)
        self.repo.update_resolution_date.assert_called_once_with(
            10, "EN_PROCESO", "RESUELTA", cursor=self.cursor,
        )
        self.activity.record_status.assert_called_once_with(10, 6, 1, None, cursor=self.cursor)
        self.assertEqual(self.transaction.return_value.__exit__.call_args.args[:2], (RuntimeError, failure))

    def test_previous_technician_cannot_read_after_reassignment(self):
        self.repo.get_context.return_value["id_personal_asignado"] = 4
        with self.assertRaises(Forbidden):
            services.get_incident(10, {"id_usuario": 3, "rol": "TECNICO"})
        self.repo.get_incident.assert_not_called()
        self.files.list_attachments.assert_not_called()

    def test_attachment_access_requires_permission_on_parent_incident(self):
        self.files.get_attachment.return_value = {"incidencias_id_incidencia": 10}
        with self.assertRaises(Forbidden):
            services.get_attachment(20, {"id_usuario": 99, "rol": "RESIDENTE"})
        self.repo.lock_incident.assert_called_once_with(10, for_update=False, cursor=self.cursor)
