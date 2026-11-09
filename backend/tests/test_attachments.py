import unittest
from io import BytesIO
from unittest.mock import patch

from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import BadRequest



from app.modules.incidents import attachments



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



