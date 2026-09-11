from pathlib import Path
from uuid import uuid4

from flask import current_app
from werkzeug.exceptions import BadRequest, Forbidden, NotFound
from werkzeug.utils import secure_filename

from app.core.db_helpers import query, transaction

MAX_FILES = 3
MAX_FILE_SIZE = 5 * 1024 * 1024

FILE_TYPES = {
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
    ".pdf": ("application/pdf", b"%PDF-"),
}

INCIDENT_SELECT = """
    SELECT
        i.id_incidencia,
        i.titulo,
        i.descripcion,
        i.fecha_reporte,
        i.id_reportante,
        i.id_unidad,
        ti.nombre AS tipo_incidencia,
        p.nombre AS prioridad,
        u.codigo AS unidad,
        e.nombre AS edificio,
        reportante.nombre AS residente_nombre,
        reportante.apellido AS residente_apellido,
        reportante.email AS residente_email,
        COALESCE(estado.nombre, 'SIN ESTADO') AS estado
    FROM incidencias i
    JOIN tipos_incidencia ti
        ON ti.id_tipo_incidencia = i.id_tipo_incidencia
    JOIN prioridades p
        ON p.id_prioridad = i.id_prioridad
    LEFT JOIN unidades u
        ON u.id_unidad = i.id_unidad
    LEFT JOIN edificios e
        ON e.id_edificio = u.id_edificio
    LEFT JOIN usuarios reportante
        ON reportante.id_usuario = i.id_reportante
    LEFT JOIN LATERAL (
        SELECT h.id_estado
        FROM historial_incidencia h
        WHERE h.id_incidencia = i.id_incidencia
        ORDER BY h.version DESC, h.id_historial_incidencia DESC
        LIMIT 1
    ) ultimo ON TRUE
    LEFT JOIN estados_incidencia estado
        ON estado.id_estados_incidencia = ultimo.id_estado
"""

def get_metadata(user_id):
    types = query("""
        SELECT id_tipo_incidencia, nombre
        FROM tipos_incidencia
        WHERE activo = TRUE
        ORDER BY nombre;
    """, many=True)

    units = query("""
        SELECT DISTINCT u.id_unidad, u.codigo, e.nombre AS edificio
        FROM residentes r
        JOIN unidades u ON u.id_unidad = r.id_unidad
        JOIN edificios e ON e.id_edificio = u.id_edificio
        WHERE r.id_usuario = %s
        ORDER BY e.nombre, u.codigo;
    """, (user_id,), many=True)

    return {"tipos": types, "unidades": units}

def prepare_files(files):
    if len(files) > MAX_FILES:
        raise BadRequest("Puedes adjuntar como máximo 3 archivos")

    prepared = []

    for uploaded in files:
        original_name = secure_filename(uploaded.filename or "")

        if not original_name or len(original_name) > 200:
            raise BadRequest("Nombre de archivo inválido o demasiado largo")

        extension = Path(original_name).suffix.lower()

        if extension not in FILE_TYPES:
            raise BadRequest("Solo se permiten archivos JPG, PNG y PDF")

        content = uploaded.stream.read(MAX_FILE_SIZE + 1)

        if not content:
            raise BadRequest("No se permiten archivos vacíos")

        if len(content) > MAX_FILE_SIZE:
            raise BadRequest("Cada archivo puede pesar como máximo 5 MB")

        mime_type, signature = FILE_TYPES[extension]

        if not content.startswith(signature):
            raise BadRequest(f"El contenido de {original_name} no coincide con su extensión")

        prepared.append({
            "storage_name": f"{uuid4().hex}{extension}",
            "original_name": original_name,
            "mime_type": mime_type,
            "content": content,
        })

    return prepared