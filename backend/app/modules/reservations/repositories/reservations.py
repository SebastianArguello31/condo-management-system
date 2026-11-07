from app.core.db_helpers import query

RESERVATION_SELECT = """
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

def get_reservation(reservation_id, *, cursor=None):
    return query(
        RESERVATION_SELECT + " WHERE r.id_reserva = %s",
        (reservation_id,),
        cursor=cursor,
    )

def list_reservations(*, user_id=None, space=None, status=None, reservation_date=None, cursor):
    conditions = []
    params = []

    if user_id is not None:
        conditions.append("r.id_usuario = %s")
        params.append(user_id)

    if space is not None:
        conditions.append("r.id_espacio_comun = %s")
        params.append(space)

    if status is not None:
        conditions.append("er.nombre = %s")
        params.append(status)

    if reservation_date is not None:
        conditions.append("r.fecha = %s")
        params.append(reservation_date)

    statement = RESERVATION_SELECT

    if conditions:
        statement += " WHERE " + " AND ".join(conditions)

    statement += """
        ORDER BY r.fecha DESC, r.hora_inicio DESC, r.id_reserva DESC
    """

    return query(statement, tuple(params), many=True, cursor=cursor)

def has_overlap(data, *, cursor):
    result = query(
        """
        SELECT r.id_reserva
        FROM reservas r
        JOIN estado_reservas er
            ON er.id_estado_reserva = r.id_estado_reserva
        WHERE r.id_espacio_comun = %s
          AND r.fecha = %s
          AND er.nombre IN ('PENDIENTE', 'CONFIRMADA')
          AND r.hora_inicio < %s
          AND r.hora_fin > %s
        LIMIT 1;
        """,
        (data["id_espacio"], data["fecha"], data["hora_fin"], data["hora_inicio"],),
        cursor=cursor,
    )

    return result is not None

def insert_reservation(data, user_id, cost, status_id, *, cursor):
    return query(
        """
        INSERT INTO reservas (
            fecha,
            hora_inicio,
            hora_fin,
            cantidad_personas,
            costo_total,
            observaciones,
            created_at,
            id_espacio_comun,
            id_usuario,
            id_tipo_evento,
            id_estado_reserva
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            CURRENT_TIMESTAMP, %s, %s, %s, %s
        )
        RETURNING id_reserva;
        """,
        (
            data["fecha"],
            data["hora_inicio"],
            data["hora_fin"],
            data["cantidad_personas"],
            cost,
            data.get("observaciones", ""),
            data["id_espacio"],
            user_id,
            data["id_tipo_evento"],
            status_id,
        ),
        cursor=cursor,
    )

def get_reservation_location(reservation_id, *, cursor):
    return query(
        """
        SELECT id_espacio_comun
        FROM reservas
        WHERE id_reserva = %s;
        """,
        (reservation_id,),
        cursor=cursor,
    )

def lock_reservation(reservation_id, *, cursor):
    return query(
        """
        SELECT id_reserva
        FROM reservas
        WHERE id_reserva = %s
        FOR UPDATE;
        """,
        (reservation_id,),
        cursor=cursor,
    )

def get_reservation_context(reservation_id, *, cursor):
    return query(
        """
        SELECT
            r.id_reserva,
            r.id_usuario,
            r.id_espacio_comun,
            r.fecha,
            r.hora_inicio,
            r.hora_fin,
            er.nombre AS estado
        FROM reservas r
        JOIN estado_reservas er
            ON er.id_estado_reserva = r.id_estado_reserva
        WHERE r.id_reserva = %s;
        """,
        (reservation_id,),
        cursor=cursor,
    )

def update_status(reservation_id, status_id, *, cursor):
    query(
        """
        UPDATE reservas
        SET id_estado_reserva = %s
        WHERE id_reserva = %s;
        """,
        (status_id, reservation_id),
        cursor=cursor,
    )