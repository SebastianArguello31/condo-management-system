import unittest
from io import BytesIO
from unittest.mock import patch

from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import BadRequest

from tests.integration.support import DatabaseCase
from app.core.security import create_access_token
from app.modules.incidents import attachments
from app.modules.incidents import services as incidencias


def archivo(nombre="prueba.pdf", contenido=b"%PDF-1.4\nprueba"):
    return FileStorage(
        stream=BytesIO(contenido),
        filename=nombre,
    )

class TestAttachmentValidation(unittest.TestCase):
    def test_rechaza_vacio_extension_firma_y_tamano(self):
        casos = [
            ("vacio.pdf", b""),
            ("ejecutable.exe", b"MZ"),
            ("imagen.png", b"no es PNG"),
            (
                "grande.pdf",
                b"%PDF-" + b"x" * attachments.MAX_FILE_BYTES,
            ),
        ]

        for nombre, contenido in casos:
            with self.subTest(nombre=nombre):
                adjunto = archivo(nombre, contenido)

                try:
                    with self.assertRaises(BadRequest):
                        attachments.prepare_files([adjunto])
                finally:
                    adjunto.close()

    def test_rechaza_mas_de_tres_archivos(self):
        adjuntos = [archivo() for _ in range(4)]

        try:
            with self.assertRaises(BadRequest):
                attachments.prepare_files(adjuntos)
        finally:
            for adjunto in adjuntos:
                adjunto.close()


class TestAttachmentsDatabase(DatabaseCase):
    def test_limpieza_de_archivo_y_rollback(self):
        adjunto = archivo()
        self.addCleanup(adjunto.close)

        with patch.object(
            incidencias.attachments_repo,
            "insert_attachment",
            side_effect=RuntimeError("Fallo de insercion simulado"),
        ):
            with self.assertRaises(RuntimeError):
                self.crear_incidencia([adjunto])

        self.assertEqual(list(self.carpeta.iterdir()), [])

        for tabla in (
            "incidencias",
            "historial_incidencia",
            "adjuntos_incidencia",
        ):
            self.assertEqual(
                self.consultar(
                    f"SELECT count(*) FROM {tabla}"
                )[0][0],
                0,
            )

    def test_descarga_autorizada_y_cabeceras(self):
        adjunto = archivo()
        self.addCleanup(adjunto.close)

        identificador = self.crear_incidencia([adjunto])
        detalle = incidencias.get_incident(
            identificador,
            self.residente,
        )
        id_adjunto = detalle["adjuntos"][0]["id_adjuntos_incidencia"]

        cliente = self.aplicacion.test_client()

        for usuario, esperado in (
            (self.residente, 200),
            (self.otro, 403),
        ):
            with self.subTest(usuario=usuario["id_usuario"]):
                token = create_access_token(
                    usuario["id_usuario"]
                )

                respuesta = cliente.get(
                    f"/condominio/incidents/attachments/{id_adjunto}",
                    headers={
                        "Authorization": f"Bearer {token}",
                    },
                )

                try:
                    self.assertEqual(
                        respuesta.status_code,
                        esperado,
                    )

                    if esperado == 200:
                        self.assertEqual(
                            respuesta.data,
                            b"%PDF-1.4\nprueba",
                        )
                        self.assertEqual(
                            respuesta.headers["X-Content-Type-Options"],
                            "nosniff",
                        )
                        self.assertEqual(
                            respuesta.headers["Cache-Control"],
                            "no-store",
                        )
                        self.assertIn(
                            "attachment",
                            respuesta.headers["Content-Disposition"],
                        )
                finally:
                    respuesta.close()