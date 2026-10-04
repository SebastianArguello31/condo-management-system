from datetime import datetime

from werkzeug.exceptions import BadRequest, Conflict, Forbidden, NotFound

from app.core.db_helpers import query, transaction

TRANSICIONES_ESTADO = {
    "PENDIENTE": ("CONFIRMADA", "RECHAZADA", "CANCELADA"),
    "CONFIRMADA": ("CANCELADA",),
}

def transicion_permitida(estado_actual, estado_nuevo):
    return estado_nuevo in TRANSICIONES_ESTADO.get(estado_actual, ())

RESERVA_SELECT = """
    SELECT
        r.id_reserva,
        to_char(r.fecha, 'YYYY-MM-DD') AS fecha,
        to_char(r.hora_inicio, 'HH24:MI') AS hora_inicio,
        to_char(r.hora_fin, 'HH24:MI') AS hora_fin,
        r.cantidad_personas,
        r.costo_total::TEXT AS costo_total,
        r.observaciones,
        r.created_at,
        r.id_espacio_comun,
        ec.nombre AS espacio,
        r.id_usuario,
        u.nombre AS residente_nombre,
        u.apellido AS residente_apellido,
        r.id_tipo_evento,
        te.nombre AS tipo_evento,
        r.id_estado_reserva,
        er.nombre AS estado
    FROM reservas r
    JOIN espacios_comunes ec
        ON ec.id_espacio_comun = r.id_espacio_comun
    JOIN usuarios u
        ON u.id_usuario = r.id_usuario
    JOIN tipos_evento te
        ON te.id_tipo_evento = r.id_tipo_evento
    JOIN estado_reservas er
        ON er.id_estado_reserva = r.id_estado_reserva
"""

def get_reserva(reserva_id):
    return query(
        RESERVA_SELECT + " WHERE r.id_reserva = %s;",
        (reserva_id,),
    )

def list_tipos_evento():
    return query("""
        SELECT id_tipo_evento, nombre, descripcion
        FROM tipos_evento
        WHERE activo = TRUE
        ORDER BY nombre;
    """, many=True)

def create_reserva(data, user_id):
    with transaction() as cursor:
        cursor.execute("""
            SELECT 1
            FROM residentes
            WHERE id_usuario = %s
            LIMIT 1;
        """, (user_id,))

        if not cursor.fetchone():
            raise Forbidden("Tu usuario no tiene una unidad vinculada")

        cursor.execute("""
            SELECT ec.id_espacio_comun, ec.capacidad, ec.activo
            FROM espacios_comunes ec
            WHERE ec.id_espacio_comun = %s
            FOR UPDATE;
        """, (data["id_espacio"],))

        espacio = cursor.fetchone()

        if not espacio:
            raise NotFound("Espacio no encontrado")

        if not espacio["activo"]:
            raise Conflict("El espacio común no está activo")

        cursor.execute("""
            SELECT
                hora_apertura,
                hora_cierre,
                duracion_max_horas,
                dias_anticipacion_min,
                dias_anticipacion_max,
                aforo_maximo,
                costo
            FROM politicas_reserva
            WHERE id_espacio_comun = %s
              AND id_tipo_evento = %s;
        """, (data["id_espacio"], data["id_tipo_evento"]))

        politica = cursor.fetchone()

        if not politica:
            raise Conflict(
                "Sin política configurada para este espacio y tipo de evento"
            )

        cursor.execute("""
            SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Asuncion')::date AS hoy,
                   (CURRENT_TIMESTAMP AT TIME ZONE 'America/Asuncion')::time AS hora_actual;
        """)

        ahora = cursor.fetchone()

        if data["fecha"] < ahora["hoy"]:
            raise Conflict("La fecha no puede ser anterior a hoy")

        if data["fecha"] == ahora["hoy"] and data["hora_inicio"] <= ahora["hora_actual"]:
            raise Conflict("Para reservar hoy, la hora de inicio debe ser futura")

        if data["hora_fin"] <= data["hora_inicio"]:
            raise Conflict("La hora de fin debe ser posterior a la hora de inicio")

        if (
            data["hora_inicio"] < politica["hora_apertura"]
            or data["hora_fin"] > politica["hora_cierre"]
        ):
            raise Conflict(
                "El horario debe estar entre "
                f"{politica['hora_apertura'].strftime('%H:%M')} y "
                f"{politica['hora_cierre'].strftime('%H:%M')}"
            )

        duracion_horas = (
            datetime.combine(ahora["hoy"], data["hora_fin"])
            - datetime.combine(ahora["hoy"], data["hora_inicio"])
        ).total_seconds() / 3600

        if duracion_horas > politica["duracion_max_horas"]:
            raise Conflict(
                f"La duración supera el máximo de {politica['duracion_max_horas']} horas"
            )

        dias_anticipacion = (data["fecha"] - ahora["hoy"]).days

        if not (
            politica["dias_anticipacion_min"]
            <= dias_anticipacion
            <= politica["dias_anticipacion_max"]
        ):
            raise Conflict(
                "La fecha debe tener entre "
                f"{politica['dias_anticipacion_min']} y "
                f"{politica['dias_anticipacion_max']} días de anticipación"
            )

        aforo = min(espacio["capacidad"], politica["aforo_maximo"])

        if data["cantidad_personas"] > aforo:
            raise Conflict(f"La cantidad de personas supera el aforo máximo de {aforo}")

        cursor.execute("""
            SELECT 1
            FROM reservas r
            JOIN estado_reservas er
                ON er.id_estado_reserva = r.id_estado_reserva
            WHERE r.id_espacio_comun = %s
              AND r.fecha = %s
              AND er.nombre IN ('PENDIENTE', 'CONFIRMADA')
              AND r.hora_inicio < %s
              AND r.hora_fin > %s
            LIMIT 1;
        """, (
            data["id_espacio"],
            data["fecha"],
            data["hora_fin"],
            data["hora_inicio"],
        ))

        if cursor.fetchone():
            raise Conflict("Ya existe una reserva activa en ese horario")

        cursor.execute("""
            SELECT id_estado_reserva
            FROM estado_reservas
            WHERE nombre = 'PENDIENTE'
            ORDER BY id_estado_reserva
            LIMIT 1;
        """)

        estado = cursor.fetchone()

        if not estado:
            raise Conflict("Falta configurar el estado PENDIENTE")

        cursor.execute("""
            INSERT INTO reservas (
                fecha, hora_inicio, hora_fin, cantidad_personas,
                costo_total, observaciones, created_at,
                id_espacio_comun, id_usuario, id_tipo_evento, id_estado_reserva
            )
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s, %s, %s)
            RETURNING id_reserva;
        """, (
            data["fecha"],
            data["hora_inicio"],
            data["hora_fin"],
            data["cantidad_personas"],
            politica["costo"],
            data["observaciones"],
            data["id_espacio"],
            user_id,
            data["id_tipo_evento"],
            estado["id_estado_reserva"],
        ))

        reserva_id = cursor.fetchone()["id_reserva"]

    return get_reserva(reserva_id)

def build_reserva_filters(user, espacio=None, estado=None, fecha=None, residente=None):
    conditions = []
    params = []

    if user["rol"] != "ADMIN":
        conditions.append("r.id_usuario = %s")
        params.append(user["id_usuario"])

    if espacio is not None:
        conditions.append("r.id_espacio_comun = %s")
        params.append(espacio)

    if fecha is not None:
        conditions.append("r.fecha = %s")
        params.append(fecha)

    if residente is not None and user["rol"] == "ADMIN":
        conditions.append("r.id_usuario = %s")
        params.append(residente)

    if estado is not None:
        conditions.append("er.nombre = %s")
        params.append(estado)

    return conditions, tuple(params)

def list_reservas(user, espacio=None, estado=None, fecha=None, residente=None):
    if estado is not None and not query(
        "SELECT 1 FROM estado_reservas WHERE nombre = %s;",
        (estado,),
    ):
        raise BadRequest("El estado indicado no existe")

    conditions, params = build_reserva_filters(
        user, espacio, estado, fecha, residente
    )

    statement = RESERVA_SELECT

    if conditions:
        statement += " WHERE " + " AND ".join(conditions)

    statement += " ORDER BY r.fecha DESC, r.hora_inicio DESC, r.id_reserva DESC;"

    return query(statement, params, many=True)

def get_reserva_detail(reserva_id, user):
    reserva = get_reserva(reserva_id)

    if not reserva:
        raise NotFound("Reserva no encontrada")

    if user["rol"] != "ADMIN" and reserva["id_usuario"] != user["id_usuario"]:
        raise Forbidden("No tienes acceso a esta reserva")

    return reserva

def cancel_reserva(reserva_id, user):
    with transaction() as cursor:
        cursor.execute("""
            SELECT r.id_usuario, r.fecha, r.hora_fin, er.nombre AS estado
            FROM reservas r
            JOIN estado_reservas er
                ON er.id_estado_reserva = r.id_estado_reserva
            WHERE r.id_reserva = %s;
        """, (reserva_id,))

        reserva = cursor.fetchone()

        if not reserva:
            raise NotFound("Reserva no encontrada")

        if user["rol"] != "ADMIN" and reserva["id_usuario"] != user["id_usuario"]:
            raise Forbidden("Solo puedes cancelar tus propias reservas")

        if reserva["estado"] == "CANCELADA":
            raise Conflict("La reserva ya está cancelada")

        if not transicion_permitida(reserva["estado"], "CANCELADA"):
            raise Conflict(
                f"No se puede cancelar una reserva en estado {reserva['estado']}"
            )

        cursor.execute("""
            SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Asuncion')::date AS hoy,
                   (CURRENT_TIMESTAMP AT TIME ZONE 'America/Asuncion')::time AS hora_actual;
        """)

        ahora = cursor.fetchone()

        if (
            reserva["fecha"] < ahora["hoy"]
            or (
                reserva["fecha"] == ahora["hoy"]
                and reserva["hora_fin"] <= ahora["hora_actual"]
            )
        ):
            raise Conflict("No se puede cancelar una reserva pasada")

        cursor.execute("""
            SELECT id_estado_reserva
            FROM estado_reservas
            WHERE nombre = 'CANCELADA'
            ORDER BY id_estado_reserva
            LIMIT 1;
        """)

        estado = cursor.fetchone()

        if not estado:
            raise Conflict("Falta configurar el estado CANCELADA")

        cursor.execute("""
            UPDATE reservas
            SET id_estado_reserva = %s
            WHERE id_reserva = %s;
        """, (estado["id_estado_reserva"], reserva_id))

    return get_reserva(reserva_id)

def cambiar_estado_reserva(reserva_id, estado_nuevo):
    with transaction() as cursor:
        cursor.execute("""
            SELECT r.id_reserva, er.nombre AS estado
            FROM reservas r
            JOIN estado_reservas er
                ON er.id_estado_reserva = r.id_estado_reserva
            WHERE r.id_reserva = %s;
        """, (reserva_id,))

        reserva = cursor.fetchone()

        if not reserva:
            raise NotFound("Reserva no encontrada")

        if not transicion_permitida(reserva["estado"], estado_nuevo):
            raise Conflict(
                f"No se permite transicionar de {reserva['estado']} a {estado_nuevo}"
            )

        cursor.execute("""
            SELECT id_estado_reserva
            FROM estado_reservas
            WHERE nombre = %s
            ORDER BY id_estado_reserva
            LIMIT 1;
        """, (estado_nuevo,))

        estado = cursor.fetchone()

        if not estado:
            raise Conflict(f"Falta configurar el estado {estado_nuevo}")

        cursor.execute("""
            UPDATE reservas
            SET id_estado_reserva = %s
            WHERE id_reserva = %s;
        """, (estado["id_estado_reserva"], reserva_id))

    return get_reserva(reserva_id)

def aprobar_reserva(reserva_id):
    return cambiar_estado_reserva(reserva_id, "CONFIRMADA")

def rechazar_reserva(reserva_id):
    return cambiar_estado_reserva(reserva_id, "RECHAZADA")
