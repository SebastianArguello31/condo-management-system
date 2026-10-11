import os
import re
import subprocess
import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from datetime import time
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

import psycopg2
from psycopg2 import sql

from app import create_app
from app.core.config import Config
from app.core.security import hash_password
from app.modules.incidents import services as incidencias
from app.modules.reservations import services as reservas

RAIZ = Path(__file__).resolve().parents[3]

class DatabaseCase(unittest.TestCase):
    def setUp(self):
        if os.getenv("RUN_DB_TESTS") != "1":
            self.skipTest(
                "Requiere RUN_DB_TESTS=1 y una base exclusiva de tests"
            )

        nombre = os.environ["TEST_DB_NAME"]

        if not nombre.endswith("_test") or nombre == Config.DB_NAME:
            raise RuntimeError(
                "TEST_DB_NAME debe terminar en _test "
                "y ser distinta de DB_NAME"
            )

        self.parametros = {
            "host": os.environ["TEST_DB_HOST"],
            "port": int(os.environ["TEST_DB_PORT"]),
            "dbname": nombre,
            "user": os.environ["TEST_DB_USER"],
            "password": os.environ["TEST_DB_PASSWORD"],
            "connect_timeout": 5,
        }

        self.esquema = "suite_" + uuid4().hex
        self.conexiones = []

        with closing(psycopg2.connect(**self.parametros)) as conexion:
            conexion.autocommit = True

            with conexion.cursor() as cursor:
                cursor.execute(
                    sql.SQL("CREATE SCHEMA {}").format(
                        sql.Identifier(self.esquema)
                    )
                )

        self.addCleanup(self.limpiar_base)

        self.consultar(
            (RAIZ / "database/schema.sql").read_text(
                encoding="utf-8-sig"
            )
        )
        self.migrar()
        self.consultar(
            (RAIZ / "database/seed.sql").read_text(
                encoding="utf-8-sig"
            )
        )

        carpeta = TemporaryDirectory(prefix="condo-tests-")
        self.addCleanup(carpeta.cleanup)
        self.carpeta = Path(carpeta.name)

        self.aplicacion = create_app({
            "TESTING": True,
            "JWT_SECRET_KEY": "clave-exclusiva-tests-mayor-a-32-caracteres",
            "JWT_ACCESS_TOKEN_HOURS": 2,
            "INCIDENT_UPLOAD_DIR": str(self.carpeta),
        })

        contexto = self.aplicacion.app_context()
        contexto.push()
        self.addCleanup(contexto.pop)

        for destino in (
            "app.core.db_helpers.get_connection",
            "app.core.database.get_connection",
        ):
            parche = patch(destino, side_effect=self.conectar)
            parche.start()
            self.addCleanup(parche.stop)

        self.hash = hash_password("Clave-pruebas-123")

        self.admin = self.crear_usuario(
            "ADMIN", "admin@example.com"
        )
        self.residente = self.crear_usuario(
            "RESIDENTE", "residente@example.com"
        )
        self.otro = self.crear_usuario(
            "RESIDENTE", "otro@example.com"
        )
        self.tecnico = self.crear_usuario(
            "TECNICO", "tecnico@example.com"
        )
        self.tecnico2 = self.crear_usuario(
            "TECNICO", "tecnico2@example.com"
        )

        self.unidad = self.consultar(
            "SELECT id_unidad FROM unidades "
            "ORDER BY id_unidad LIMIT 1"
        )[0][0]

        self.consultar(
            "INSERT INTO residentes(id_usuario,id_unidad) "
            "VALUES (%s,%s)",
            (self.residente["id_usuario"], self.unidad),
        )

        self.evento = self.consultar(
            "SELECT id_tipo_evento FROM tipos_evento "
            "WHERE activo ORDER BY id_tipo_evento LIMIT 1"
        )[0][0]

        self.tipo = self.consultar(
            "SELECT id_tipo_incidencia FROM tipos_incidencia "
            "WHERE activo ORDER BY id_tipo_incidencia LIMIT 1"
        )[0][0]

        self.espacio = self.crear_espacio()

        self.manana = self.consultar(
            "SELECT "
            "(clock_timestamp() AT TIME ZONE 'America/Asuncion')::date + 1"
        )[0][0]

    def conectar(self):
        conexion = psycopg2.connect(
            **self.parametros,
            options=(
                f"-c search_path={self.esquema} "
                "-c lock_timeout=5000 "
                "-c statement_timeout=10000"
            ),
        )
        conexion.set_session(isolation_level="READ COMMITTED")
        self.conexiones.append(conexion)

        return conexion

    def consultar(self, sentencia, parametros=()):
        with closing(self.conectar()) as conexion:
            with conexion:
                with conexion.cursor() as cursor:
                    cursor.execute(sentencia, parametros)

                    if cursor.description:
                        return cursor.fetchall()

                    return []

    def migrar(self):
        entorno = os.environ.copy()
        entorno.update({
            "DB_HOST": self.parametros["host"],
            "DB_PORT": str(self.parametros["port"]),
            "DB_NAME": self.parametros["dbname"],
            "DB_USER": self.parametros["user"],
            "DB_PASSWORD": self.parametros["password"],
            "PGOPTIONS": (
                f"-c search_path={self.esquema} "
                "-c lock_timeout=5000 "
                "-c statement_timeout=10000"
            ),
            "PYTHONDONTWRITEBYTECODE": "1",
        })

        subprocess.run(
            [
                sys.executable,
                "-B",
                "-m",
                "alembic",
                "-c",
                str(RAIZ / "alembic.ini"),
                "upgrade",
                "head",
            ],
            cwd=RAIZ,
            env=entorno,
            check=True,
            timeout=60,
        )

    def limpiar_base(self):
        for conexion in self.conexiones:
            if not conexion.closed:
                conexion.close()

        if not re.fullmatch(r"suite_[0-9a-f]{32}", self.esquema):
            raise RuntimeError("Nombre de esquema inesperado")

        with closing(psycopg2.connect(**self.parametros)) as conexion:
            conexion.autocommit = True

            with conexion.cursor() as cursor:
                cursor.execute(
                    sql.SQL("DROP SCHEMA {} CASCADE").format(
                        sql.Identifier(self.esquema)
                    )
                )

    def crear_usuario(self, rol, correo):
        identificador = self.consultar(
            """
            INSERT INTO usuarios (
                nombre, apellido, email, telefono, password_hash, id_rol
            )
            VALUES (
                'Prueba', 'Automatica', %s, '12345678', %s,
                (SELECT id_rol FROM roles WHERE nombre=%s)
            )
            RETURNING id_usuario
            """,
            (correo, self.hash, rol),
        )[0][0]

        return {
            "id_usuario": identificador,
            "rol": rol,
            "activo": True,
        }

    def crear_espacio(self):
        identificador = self.consultar(
            """
            INSERT INTO espacios_comunes (
                nombre, capacidad, id_edificio
            )
            VALUES (
                'Espacio de pruebas',
                30,
                (SELECT MIN(id_edificio) FROM edificios)
            )
            RETURNING id_espacio_comun
            """
        )[0][0]

        self.consultar(
            """
            INSERT INTO politicas_reserva (
                id_espacio_comun,
                id_tipo_evento,
                hora_apertura,
                hora_cierre,
                duracion_max_horas,
                dias_anticipacion_min,
                dias_anticipacion_max,
                aforo_maximo,
                costo,
                deposito_garantia,
                penalizaciones
            )
            VALUES (%s,%s,'08:00','22:00',4,0,30,20,100,0,0)
            """,
            (identificador, self.evento),
        )

        return identificador

    def datos_reserva(self, **cambios):
        return {
            "id_espacio": self.espacio,
            "id_tipo_evento": self.evento,
            "fecha": self.manana,
            "hora_inicio": time(10),
            "hora_fin": time(12),
            "cantidad_personas": 10,
            "observaciones": "",
            **cambios,
        }

    def crear_reserva(self, **cambios):
        return reservas.create_reservation(
            self.datos_reserva(**cambios),
            self.residente,
        )

    def crear_incidencia(self, archivos=None):
        resultado = incidencias.create_incident(
            {
                "titulo": "Incidencia de prueba",
                "descripcion": "Descripcion de prueba para verificar el flujo",
                "id_unidad": self.unidad,
                "id_tipo_incidencia": self.tipo,
            },
            archivos or [],
            self.residente,
        )

        return resultado["id_incidencia"]

    def paralelas(self, *operaciones):
        barrera = Barrier(len(operaciones))

        def ejecutar(operacion):
            with self.aplicacion.app_context():
                barrera.wait(timeout=10)
                return operacion()

        with ThreadPoolExecutor(
            max_workers=len(operaciones)
        ) as ejecutor:
            tareas = [
                ejecutor.submit(ejecutar, operacion)
                for operacion in operaciones
            ]

            return [
                tarea.result(timeout=20)
                for tarea in tareas
            ]