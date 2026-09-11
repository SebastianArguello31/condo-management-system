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

def create_incident(data, files, user_id):
    prepared = prepare_files(files)
    upload_dir = Path(current_app.config["INCIDENT_UPLOAD_DIR"])
    created_paths = []

    try:
        with transaction() as cursor:
            cursor.execute("""
                SELECT id_residente
                FROM residentes
                WHERE id_usuario = %s AND id_unidad = %s
                LIMIT 1
                FOR SHARE;
            """, (user_id, data["id_unidad"]))

            if not cursor.fetchone():
                raise Forbidden("La unidad no está asociada a tu usuario")

            cursor.execute("""
                SELECT id_tipo_incidencia
                FROM tipos_incidencia
                WHERE id_tipo_incidencia = %s AND activo = TRUE;
            """, (data["id_tipo_incidencia"],))

            if not cursor.fetchone():
                raise BadRequest("El tipo de incidencia no está disponible")

            cursor.execute("""
                SELECT id_prioridad, tiempo_resolucion_horas
                FROM prioridades
                WHERE nombre = 'Normal' AND activo = TRUE
                ORDER BY id_prioridad
                LIMIT 1;
            """)

            priority = cursor.fetchone()

            cursor.execute("""
                SELECT id_estados_incidencia
                FROM estados_incidencia
                WHERE nombre = 'RECIBIDA'
                ORDER BY id_estados_incidencia
                LIMIT 1;
            """)

            state = cursor.fetchone()

            if not priority or not state:
                raise BadRequest("Falta configurar la prioridad Normal o el estado RECIBIDA")

            cursor.execute("""
                INSERT INTO incidencias (titulo, descripcion, id_unidad, id_tipo_incidencia, id_prioridad, id_reportante, fecha_limite)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP + (%s * INTERVAL '1 hour'))
                RETURNING id_incidencia;
            """, (data["titulo"], data["descripcion"], data["id_unidad"], data["id_tipo_incidencia"], priority["id_prioridad"], user_id, priority["tiempo_resolucion_horas"],))

            incident_id = cursor.fetchone()["id_incidencia"]

            cursor.execute("""
                INSERT INTO historial_incidencia (fecha, version, id_estado, id_incidencia, id_usuario)
                VALUES (CURRENT_TIMESTAMP, 1, %s, %s, %s);
            """, (state["id_estados_incidencia"], incident_id, user_id,))

            for file in prepared:
                path = upload_dir / file["storage_name"]

                with path.open("xb") as destination:
                    created_paths.append(path)
                    destination.write(file["content"])

                cursor.execute("""
                    INSERT INTO adjuntos_incidencia (url_archivo, nombre_original, tipo, fecha, id_usuario, incidencias_id_incidencia)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP, %s, %s);
                """, (file["storage_name"], file["original_name"], file["mime_type"], user_id, incident_id,))

        return {"id_incidencia": incident_id, "estado": "RECIBIDA"}

    except Exception:
        for path in created_paths:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                current_app.logger.exception("No se pudo limpiar el adjunto %s", path.name)

        raise

def list_incidents(user):
    if user["rol"] == "ADMIN":
        return query(INCIDENT_SELECT + " ORDER BY i.id_incidencia DESC;", many=True,)

    return query(
        INCIDENT_SELECT + """
            WHERE i.id_reportante = %s
            ORDER BY i.id_incidencia DESC;
        """,(user["id_usuario"],), many=True,
    )

def get_incident(incident_id, user):
    statement = INCIDENT_SELECT + " WHERE i.id_incidencia = %s"
    params = [incident_id]

    if user["rol"] != "ADMIN":
        statement += " AND i.id_reportante = %s"
        params.append(user["id_usuario"])

    incident = query(statement, tuple(params))

    if not incident:
        raise NotFound("Solicitud no encontrada")

    incident["adjuntos"] = query("""
        SELECT id_adjuntos_incidencia, COALESCE(nombre_original, 'Adjunto') AS nombre_original, tipo
        FROM adjuntos_incidencia
        WHERE incidencias_id_incidencia = %s
        ORDER BY id_adjuntos_incidencia;
    """, (incident_id,), many=True)

    return incident

def get_attachment(attachment_id, user):
    statement = """
        SELECT a.url_archivo, a.nombre_original
        FROM adjuntos_incidencia a
        JOIN incidencias i
            ON i.id_incidencia = a.incidencias_id_incidencia
        WHERE a.id_adjuntos_incidencia = %s
    """
    params = [attachment_id]

    if user["rol"] != "ADMIN":
        statement += " AND i.id_reportante = %s"
        params.append(user["id_usuario"])

    attachment = query(statement, tuple(params))

    if not attachment:
        raise NotFound("Adjunto no encontrado")

    return attachment
