import unittest
from io import BytesIO
from unittest.mock import patch

from flask import Flask, request
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import BadRequest



from app.modules.incidents import attachments
from app import configure_app



def archivo(nombre="prueba.pdf", contenido=b"%PDF-1.4\nprueba"):
    return FileStorage(
        stream=BytesIO(contenido),
        filename=nombre,
    )

class TestAttachmentValidation(unittest.TestCase):
    def test_video_con_bytes_pendientes_entre_bloques_multipart(self):
        app = Flask(__name__)
        configure_app(app, {"JWT_SECRET_KEY": "test-only"})

        @app.post("/upload-test")
        def upload():
            prepared = attachments.prepare_files(request.files.getlist("archivos"))
            return {"count": len(prepared)}

        header = (20).to_bytes(4, "big") + b"ftypisom" + bytes(4) + b"isom"
        # Los CR provocan que el parser conserve bytes al recibir el siguiente
        # bloque de 64 KiB. Antes se rechazaba pese a estar dentro del límite.
        content = header + b"\r" * (5 * 1024 * 1024)

        def send():
            return app.test_client().post("/upload-test", data={
                "archivos": (BytesIO(content), "video.mp4"),
            })

        with patch.dict(app.config, MAX_FORM_MEMORY_SIZE=64 * 1024):
            self.assertEqual(send().status_code, 413)

        response = send()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"count": 1})

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



