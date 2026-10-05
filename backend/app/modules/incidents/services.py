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

ALLOWED_TRANSITIONS = {
    "RECIBIDA": {"EN_REVISION", "ASIGNADA", "RECHAZADA", "CANCELADA"},
    "EN_REVISION": {"ASIGNADA", "EN_PROCESO", "RECHAZADA", "CANCELADA"},
    "ASIGNADA": {"EN_PROCESO", "EN_ESPERA", "CANCELADA"},
    "EN_PROCESO": {"EN_ESPERA", "RESUELTA", "CANCELADA"},
    "EN_ESPERA": {"EN_PROCESO", "RESUELTA", "CANCELADA"},
    "RESUELTA": {"CERRADA", "EN_PROCESO"},
    "CERRADA": {"EN_PROCESO"},       #Permite reabrir el caso de ser necesario.
    "RECHAZADA": {"RECIBIDA"},       #Permite volver a abrir un caso rechazado
    "CANCELADA": set(),
}

INCIDENT_SELECT = """
    SELECT
        i.id_incidencia,
        i.titulo,
        i.descripcion,
        i.fecha_reporte,
        i.fecha_limite,
        i.fecha_resolucion,
        i.created_at,
        i.updated_at,
        i.id_reportante,
        i.id_unidad,
        ti.id_tipo_incidencia,
        ti.nombre AS tipo_incidencia,
        p.id_prioridad,
        p.nombre AS prioridad,
        p.nivel AS nivel_prioridad,
        p.tiempo_resolucion_horas,
        u.codigo AS unidad,
        e.nombre AS edificio,
        reportante.nombre AS residente_nombre,
        reportante.apellido AS residente_apellido,
        reportante.email AS residente_email,
        reportante.telefono AS residente_telefono,
        COALESCE(estado.nombre, 'SIN ESTADO') AS estado,
        COALESCE(estado.id_estados_incidencia, 0) AS id_estado,
        asignado.id_asignacion,
        asignado.id_personal_asignado,
        tecnico.nombre AS tecnico_nombre,
        tecnico.apellido AS tecnico_apellido,
        tecnico.email AS tecnico_email,
        asignado.fecha_asignacion,
        asignado.notas AS notas_asignacion
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
    LEFT JOIN LATERAL (
        SELECT a.id_asignacion, a.id_personal_asignado, a.fecha_asignacion, a.notas
        FROM asignaciones a
        WHERE a.id_incidencia = i.id_incidencia AND a.activa = TRUE
        ORDER BY a.fecha_asignacion DESC, a.id_asignacion DESC
        LIMIT 1
    ) asignado ON TRUE
    LEFT JOIN usuarios tecnico
        ON tecnico.id_usuario = asignado.id_personal_asignado
"""

def list_priorities():
    return query("""
        SELECT id_prioridad, nombre, nivel, tiempo_resolucion_horas
        FROM prioridades
        WHERE activo = TRUE
        ORDER BY nivel ASC;
    """, many=True)

def list_statuses():
    return query("""
        SELECT id_estados_incidencia AS id_estado, nombre, descripcion
        FROM estados_incidencia
        ORDER BY id_estados_incidencia ASC;
    """, many=True)

def list_technicians():
    return query("""
        SELECT
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.activo,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id_especialidad', e.id_especialidad,
                    'nombre', e.nombre
                ) ORDER BY e.nombre)
                FROM usuario_especialidades ue
                JOIN especialidades e USING (id_especialidad)
                WHERE ue.id_usuario = u.id_usuario AND e.activo = TRUE
            ), '[]'::json) AS especialidades
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE r.nombre = 'TECNICO' AND u.activo = TRUE
        ORDER BY u.apellido, u.nombre;
    """, many=True)

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
                INSERT INTO incidencias (
                    titulo, descripcion, id_unidad, id_tipo_incidencia,
                    id_prioridad, id_reportante, fecha_limite
                )
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP + (%s * INTERVAL '1 hour'))
                RETURNING id_incidencia;
            """, (
                data["titulo"],
                data["descripcion"],
                data["id_unidad"],
                data["id_tipo_incidencia"],
                priority["id_prioridad"],
                user_id,
                priority["tiempo_resolucion_horas"],
            ))

            incident_id = cursor.fetchone()["id_incidencia"]

            cursor.execute("""
                INSERT INTO historial_incidencia (fecha, version, id_estado, id_incidencia, id_usuario)
                VALUES (CURRENT_TIMESTAMP, 1, %s, %s, %s);
            """, (state["id_estados_incidencia"], incident_id, user_id))

            for file in prepared:
                path = upload_dir / file["storage_name"]

                with path.open("xb") as destination:
                    created_paths.append(path)
                    destination.write(file["content"])

                cursor.execute("""
                    INSERT INTO adjuntos_incidencia (
                        url_archivo, nombre_original, tipo, fecha,
                        id_usuario, incidencias_id_incidencia
                    )
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP, %s, %s);
                """, (
                    file["storage_name"],
                    file["original_name"],
                    file["mime_type"],
                    user_id,
                    incident_id,
                ))

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
        return query(INCIDENT_SELECT + " ORDER BY i.id_incidencia DESC;", many=True)

    if user["rol"] == "TECNICO":
        return query(
            INCIDENT_SELECT + """
                WHERE asignado.id_personal_asignado = %s
                ORDER BY i.id_incidencia DESC;
            """,
            (user["id_usuario"],),
            many=True,
        )

    return query(
        INCIDENT_SELECT + """
            WHERE i.id_reportante = %s
            ORDER BY i.id_incidencia DESC;
        """,
        (user["id_usuario"],),
        many=True,
    )

def get_incident(incident_id, user):
    statement = INCIDENT_SELECT + " WHERE i.id_incidencia = %s"
    params = [incident_id]

    if user["rol"] == "RESIDENTE":
        statement += " AND i.id_reportante = %s"
        params.append(user["id_usuario"])
    elif user["rol"] == "TECNICO":
        statement += " AND asignado.id_personal_asignado = %s"
        params.append(user["id_usuario"])

    incident = query(statement, tuple(params))

    if not incident:
        raise NotFound("Solicitud no encontrada")

    choices = ALLOWED_TRANSITIONS.get(incident["estado"], set())
    if user["rol"] == "TECNICO":
        choices = choices & {"EN_PROCESO", "EN_ESPERA", "RESUELTA"}
    elif user["rol"] == "RESIDENTE":
        choices = {"CANCELADA"} if incident["estado"] in ("RECIBIDA", "EN_REVISION") else set()
    if not incident["id_personal_asignado"]:
        choices = choices - {"ASIGNADA", "EN_PROCESO", "EN_ESPERA", "RESUELTA", "CERRADA"}
    incident["estados_permitidos"] = sorted(choices)
    incident["adjuntos"] = query("""
        SELECT id_adjuntos_incidencia, COALESCE(nombre_original, 'Adjunto') AS nombre_original, tipo
        FROM adjuntos_incidencia
        WHERE incidencias_id_incidencia = %s
        ORDER BY id_adjuntos_incidencia;
    """, (incident_id,), many=True)

    return incident

def get_incident_history(incident_id, user):
    get_incident(incident_id, user)

    return query("""
        SELECT
            h.id_historial_incidencia,
            h.fecha,
            h.version,
            h.comentario,
            e.id_estados_incidencia AS id_estado,
            e.nombre AS estado,
            e.descripcion AS estado_descripcion,
            u.id_usuario,
            u.nombre AS usuario_nombre,
            u.apellido AS usuario_apellido,
            r.nombre AS usuario_rol
        FROM historial_incidencia h
        JOIN estados_incidencia e ON e.id_estados_incidencia = h.id_estado
        JOIN usuarios u ON u.id_usuario = h.id_usuario
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE h.id_incidencia = %s
        ORDER BY h.version ASC, h.fecha ASC;
    """, (incident_id,), many=True)

def get_incident_assignments(incident_id, user):
    get_incident(incident_id, user)

    return query("""
        SELECT
            a.id_asignacion,
            a.fecha_asignacion,
            a.activa,
            a.notas,
            u.id_usuario AS id_personal_asignado,
            u.nombre AS tecnico_nombre,
            u.apellido AS tecnico_apellido,
            u.email AS tecnico_email,
            u.telefono AS tecnico_telefono
        FROM asignaciones a
        JOIN usuarios u ON u.id_usuario = a.id_personal_asignado
        WHERE a.id_incidencia = %s
        ORDER BY a.fecha_asignacion DESC, a.id_asignacion DESC;
    """, (incident_id,), many=True)

def assign_technician(incident_id, data, actor):
    if actor["rol"] != "ADMIN":
        raise Forbidden("Solo administradores pueden asignar personal a una incidencia")

    tech_id = data["id_personal_asignado"]
    notes = data.get("notas")

    with transaction() as cursor:
        cursor.execute("""
            SELECT id_incidencia, id_prioridad, fecha_reporte
            FROM incidencias
            WHERE id_incidencia = %s
            FOR UPDATE;
        """, (incident_id,))
        incident = cursor.fetchone()
        if not incident:
            raise NotFound("Incidencia no encontrada")

        cursor.execute("""
            SELECT u.id_usuario, u.nombre, u.apellido, u.activo, r.nombre AS rol
            FROM usuarios u
            JOIN roles r ON r.id_rol = u.id_rol
            WHERE u.id_usuario = %s
            FOR SHARE;
        """, (tech_id,))
        tech = cursor.fetchone()

        if not tech:
            raise NotFound("El técnico indicado no existe")

        if not tech["activo"]:
            raise BadRequest("No se puede asignar un técnico desactivado")

        if tech["rol"] != "TECNICO":
            raise BadRequest("El usuario asignado debe tener el rol TECNICO")

        cursor.execute("""
            SELECT e.nombre FROM historial_incidencia h
            JOIN estados_incidencia e ON e.id_estados_incidencia = h.id_estado
            WHERE h.id_incidencia = %s
            ORDER BY h.version DESC, h.id_historial_incidencia DESC LIMIT 1
        """, (incident_id,))
        state = cursor.fetchone()
        if state and state["nombre"] in ("RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA"):
            raise BadRequest("Reabre la incidencia antes de asignar un técnico")

        # Desactivar asignaciones activas anteriores para esta incidencia
        cursor.execute("""
            UPDATE asignaciones
            SET activa = FALSE
            WHERE id_incidencia = %s AND activa = TRUE;
        """, (incident_id,))

        # Registrar la nueva asignación activa
        cursor.execute("""
            INSERT INTO asignaciones (
                id_incidencia, id_personal_asignado, fecha_asignacion, activa, notas
            )
            VALUES (%s, %s, CURRENT_TIMESTAMP, TRUE, %s)
            RETURNING id_asignacion, fecha_asignacion;
        """, (incident_id, tech_id, notes))

        # Consultar estado actual
        cursor.execute("""
            SELECT h.id_estado, e.nombre AS estado_nombre
            FROM historial_incidencia h
            JOIN estados_incidencia e ON e.id_estados_incidencia = h.id_estado
            WHERE h.id_incidencia = %s
            ORDER BY h.version DESC, h.id_historial_incidencia DESC
            LIMIT 1
            FOR UPDATE;
        """, (incident_id,))
        current_state = cursor.fetchone()

        # Si estaba en RECIBIDA o EN_REVISION, avanza automáticamente a ASIGNADA
        if current_state and current_state["estado_nombre"] in ("RECIBIDA", "EN_REVISION"):
            cursor.execute("""
                SELECT id_estados_incidencia
                FROM estados_incidencia
                WHERE nombre = 'ASIGNADA'
                LIMIT 1;
            """)
            assigned_state = cursor.fetchone()
            if assigned_state:
                cursor.execute("""
                    SELECT COALESCE(MAX(version), 0) + 1 AS next_version
                    FROM historial_incidencia
                    WHERE id_incidencia = %s;
                """, (incident_id,))
                next_version = cursor.fetchone()["next_version"]

                cursor.execute("""
                    INSERT INTO historial_incidencia (fecha, version, id_estado, id_incidencia, id_usuario)
                    VALUES (CURRENT_TIMESTAMP, %s, %s, %s, %s);
                """, (next_version, assigned_state["id_estados_incidencia"], incident_id, actor["id_usuario"]))

        cursor.execute("""
            UPDATE incidencias
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id_incidencia = %s;
        """, (incident_id,))

    return get_incident(incident_id, actor)

def update_priority(incident_id, data, actor):
    if actor["rol"] != "ADMIN":
        raise Forbidden("Solo administradores pueden cambiar la prioridad de una incidencia")

    priority_id = data["id_prioridad"]

    with transaction() as cursor:
        cursor.execute("""
            SELECT id_incidencia, fecha_reporte
            FROM incidencias
            WHERE id_incidencia = %s
            FOR UPDATE;
        """, (incident_id,))
        incident = cursor.fetchone()
        if not incident:
            raise NotFound("Incidencia no encontrada")

        cursor.execute("""
            SELECT id_prioridad, nombre, tiempo_resolucion_horas, activo
            FROM prioridades
            WHERE id_prioridad = %s
            FOR SHARE;
        """, (priority_id,))
        priority = cursor.fetchone()

        if not priority:
            raise NotFound("La prioridad indicada no existe")

        if not priority["activo"]:
            raise BadRequest("La prioridad seleccionada no está activa")

        cursor.execute("""
            UPDATE incidencias
            SET id_prioridad = %s,
                fecha_limite = fecha_reporte + (%s * INTERVAL '1 hour'),
                updated_at = CURRENT_TIMESTAMP
            WHERE id_incidencia = %s;
        """, (priority_id, priority["tiempo_resolucion_horas"], incident_id))

    return get_incident(incident_id, actor)

def update_status(incident_id, data, actor):
    role = actor["rol"]

    with transaction() as cursor:
        cursor.execute("""
            SELECT i.id_incidencia, i.id_reportante, i.fecha_resolucion,
                   asignado.id_personal_asignado
            FROM incidencias i
            LEFT JOIN LATERAL (
                SELECT a.id_personal_asignado
                FROM asignaciones a
                WHERE a.id_incidencia = i.id_incidencia AND a.activa = TRUE
                ORDER BY a.fecha_asignacion DESC, a.id_asignacion DESC
                LIMIT 1
            ) asignado ON TRUE
            WHERE i.id_incidencia = %s
            FOR UPDATE OF i;
        """, (incident_id,))
        incident = cursor.fetchone()
        if not incident:
            raise NotFound("Incidencia no encontrada")

        # Consultar estado actual
        cursor.execute("""
            SELECT h.id_estado, e.nombre AS estado_actual
            FROM historial_incidencia h
            JOIN estados_incidencia e ON e.id_estados_incidencia = h.id_estado
            WHERE h.id_incidencia = %s
            ORDER BY h.version DESC, h.id_historial_incidencia DESC
            LIMIT 1
            FOR UPDATE;
        """, (incident_id,))
        last_history = cursor.fetchone()
        current_state_name = last_history["estado_actual"] if last_history else "RECIBIDA"

        # Obtener el estado destino
        target_state = None
        if data.get("id_estado"):
            cursor.execute("""
                SELECT id_estados_incidencia, nombre
                FROM estados_incidencia
                WHERE id_estados_incidencia = %s;
            """, (data["id_estado"],))
            target_state = cursor.fetchone()
        elif data.get("estado"):
            cursor.execute("""
                SELECT id_estados_incidencia, nombre
                FROM estados_incidencia
                WHERE UPPER(nombre) = UPPER(%s);
            """, (data["estado"],))
            target_state = cursor.fetchone()

        if not target_state:
            raise BadRequest("Debes indicar un estado válido existente")

        new_state_name = target_state["nombre"].upper()

        if new_state_name == current_state_name:
            raise BadRequest(f"La incidencia ya se encuentra en estado {current_state_name}")

        # Validaciones de transiciones permitidas
        allowed = ALLOWED_TRANSITIONS.get(current_state_name, set())
        if new_state_name not in allowed:
            raise BadRequest(f"No se permite transicionar de {current_state_name} a {new_state_name}")

        # Permisos específicos por rol
        if role == "RESIDENTE":
            if incident["id_reportante"] != actor["id_usuario"]:
                raise Forbidden("No puedes modificar el estado de incidencias ajenas")
            if new_state_name != "CANCELADA":
                raise Forbidden("Los residentes solo pueden cancelar su propia solicitud")
            if current_state_name not in ("RECIBIDA", "EN_REVISION"):
                raise BadRequest("No puedes cancelar una incidencia que ya está siendo atendida")

        elif role == "TECNICO":
            if incident["id_personal_asignado"] != actor["id_usuario"]:
                raise Forbidden("Solo puedes actualizar incidencias asignadas a ti")
            if new_state_name not in ("EN_PROCESO", "EN_ESPERA", "RESUELTA"):
                raise Forbidden(f"Los técnicos no pueden establecer el estado {new_state_name}")

        if new_state_name in ("ASIGNADA", "EN_PROCESO", "EN_ESPERA", "RESUELTA", "CERRADA") and not incident["id_personal_asignado"]:
            raise BadRequest("Asigna un técnico antes de avanzar la incidencia")

        # Actualiza la fecha de resolución si es necesario.
        if new_state_name in ("RESUELTA", "CERRADA"):
            cursor.execute("""
                UPDATE incidencias
                SET fecha_resolucion = COALESCE(fecha_resolucion, CURRENT_TIMESTAMP),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_incidencia = %s;
            """, (incident_id,))
        elif current_state_name in ("RESUELTA", "CERRADA") and new_state_name == "EN_PROCESO":
            cursor.execute("""
                UPDATE incidencias
                SET fecha_resolucion = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_incidencia = %s;
            """, (incident_id,))
        else:
            cursor.execute("""
                UPDATE incidencias
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id_incidencia = %s;
            """, (incident_id,))

        # Registrar nuevo evento en historial_incidencia
        cursor.execute("""
            SELECT COALESCE(MAX(version), 0) + 1 AS next_version
            FROM historial_incidencia
            WHERE id_incidencia = %s;
        """, (incident_id,))
        next_version = cursor.fetchone()["next_version"]

        cursor.execute("""
            INSERT INTO historial_incidencia (fecha, version, id_estado, id_incidencia, id_usuario, comentario)
            VALUES (CURRENT_TIMESTAMP, %s, %s, %s, %s, %s);
        """, (next_version, target_state["id_estados_incidencia"], incident_id, actor["id_usuario"], data.get("comentario")))

    return get_incident(incident_id, actor)

def get_attachment(attachment_id, user):
    statement = """
        SELECT
            a.url_archivo,
            a.nombre_original,
            a.incidencias_id_incidencia,
            i.id_reportante,
            asignado.id_personal_asignado
        FROM adjuntos_incidencia a
        JOIN incidencias i
            ON i.id_incidencia = a.incidencias_id_incidencia
        LEFT JOIN LATERAL (
            SELECT a2.id_personal_asignado
            FROM asignaciones a2
            WHERE a2.id_incidencia = i.id_incidencia AND a2.activa = TRUE
            ORDER BY a2.fecha_asignacion DESC, a2.id_asignacion DESC
            LIMIT 1
        ) asignado ON TRUE
        WHERE a.id_adjuntos_incidencia = %s
    """
    params = [attachment_id]

    attachment = query(statement, tuple(params))

    if not attachment:
        raise NotFound("Adjunto no encontrado")

    if user["rol"] == "RESIDENTE" and attachment["id_reportante"] != user["id_usuario"]:
        raise Forbidden("No tienes acceso a este adjunto")

    if user["rol"] == "TECNICO" and attachment["id_personal_asignado"] != user["id_usuario"]:
        raise Forbidden("No tienes acceso a este adjunto")

    return attachment

def list_interventions(incident_id, actor):
    get_incident(incident_id, actor)
    return query("""
        SELECT v.id_intervencion, v.fecha_inicio, v.fecha_fin, v.resultado,
               v.id_personal, u.nombre AS tecnico_nombre, u.apellido AS tecnico_apellido
        FROM intervenciones v JOIN usuarios u ON u.id_usuario = v.id_personal
        WHERE v.id_incidencia = %s ORDER BY v.fecha_inicio DESC, v.id_intervencion DESC
    """, (incident_id,), many=True)

def create_intervention(incident_id, data, actor):
    if actor["rol"] not in ("ADMIN", "TECNICO"):
        raise Forbidden("Solo el equipo técnico puede registrar intervenciones")
    with transaction() as cursor:
        cursor.execute("SELECT id_incidencia FROM incidencias WHERE id_incidencia = %s FOR UPDATE", (incident_id,))
        if not cursor.fetchone():
            raise NotFound("Incidencia no encontrada")
        cursor.execute("""
            SELECT id_personal_asignado FROM asignaciones
            WHERE id_incidencia = %s AND activa = TRUE
            ORDER BY fecha_asignacion DESC, id_asignacion DESC LIMIT 1
        """, (incident_id,))
        assigned = cursor.fetchone()
        if not assigned or (actor["rol"] == "TECNICO" and assigned["id_personal_asignado"] != actor["id_usuario"]):
            raise Forbidden("La incidencia debe estar asignada al técnico responsable")
        cursor.execute("""
            SELECT e.nombre FROM historial_incidencia h
            JOIN estados_incidencia e ON e.id_estados_incidencia = h.id_estado
            WHERE h.id_incidencia = %s ORDER BY h.version DESC, h.id_historial_incidencia DESC LIMIT 1
        """, (incident_id,))
        state = cursor.fetchone()
        if not state or state["nombre"] not in ("ASIGNADA", "EN_PROCESO", "EN_ESPERA"):
            raise BadRequest("Solo puedes intervenir una incidencia asignada o en atención")
        cursor.execute("""
            INSERT INTO intervenciones (fecha_inicio, fecha_fin, resultado, created_at, id_incidencia, id_personal)
            VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s, CURRENT_TIMESTAMP, %s, %s)
            RETURNING id_intervencion, fecha_inicio, fecha_fin, resultado, id_personal
        """, (data["resultado"], incident_id, actor["id_usuario"]))
        result = cursor.fetchone()
        cursor.execute("UPDATE incidencias SET updated_at = CURRENT_TIMESTAMP WHERE id_incidencia = %s", (incident_id,))
    return result
