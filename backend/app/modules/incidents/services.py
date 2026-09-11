from pathlib import Path
from uuid import uuid4

from flask import current_app
from werkzeug.exceptions import BadRequest, Forbidden, NotFound
from werkzeug.utils import secure_filename

from app.core.db_helpers import query, transaction

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