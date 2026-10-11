from psycopg2.errors import UniqueViolation
from werkzeug.exceptions import BadRequest

from tests.integration.support import DatabaseCase
from app.modules.users.services import resident_units, specialties

class TestUsersDatabase(DatabaseCase):
    def test_correo_normalizado_es_unico(self):
        with self.assertRaises(UniqueViolation):
            self.crear_usuario(
                "RESIDENTE",
                "  RESIDENTE@EXAMPLE.COM  ",
            )

    def test_creaciones_simultaneas_mismo_correo(self):
        def crear():
            try:
                self.crear_usuario(
                    "RESIDENTE",
                    "concurrente@example.com",
                )
                return "creada"
            except UniqueViolation:
                return "duplicada"

        self.assertCountEqual(
            self.paralelas(crear, crear),
            ["creada", "duplicada"],
        )

        self.assertEqual(
            self.consultar(
                "SELECT count(*) FROM usuarios "
                "WHERE email='concurrente@example.com'"
            )[0][0],
            1,
        )

    def test_vinculo_residente_no_se_duplica(self):
        for _ in range(2):
            resident_units.link_unit(
                self.residente["id_usuario"],
                self.unidad,
                self.admin["id_usuario"],
            )

        self.assertEqual(
            self.consultar(
                """
                SELECT count(*) FROM residentes
                WHERE id_usuario=%s AND id_unidad=%s
                """,
                (
                    self.residente["id_usuario"],
                    self.unidad,
                ),
            )[0][0],
            1,
        )

    def test_no_elimina_ultima_especialidad(self):
        especialidad = self.consultar(
            """
            SELECT id_especialidad FROM especialidades
            WHERE activo
            ORDER BY id_especialidad
            LIMIT 1
            """
        )[0][0]

        specialties.link_specialty(
            self.tecnico["id_usuario"],
            especialidad,
            self.admin["id_usuario"],
        )

        with self.assertRaises(BadRequest):
            specialties.unlink_specialty(
                self.tecnico["id_usuario"],
                especialidad,
                self.admin["id_usuario"],
            )

        self.assertEqual(
            self.consultar(
                """
                SELECT count(*) FROM usuario_especialidades
                WHERE id_usuario=%s
                """,
                (self.tecnico["id_usuario"],),
            )[0][0],
            1,
        )