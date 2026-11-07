from app.core.db_helpers import query

def list_event_types():
    return query(
        """
        SELECT id_tipo_evento, nombre, descripcion
        FROM tipos_evento
        WHERE activo = TRUE
        ORDER BY nombre, id_tipo_evento;
        """,
        many=True,
    )

def get_active_event_type(event_type_id, *, cursor):
    return query(
        """
        SELECT id_tipo_evento
        FROM tipos_evento
        WHERE id_tipo_evento = %s
          AND activo = TRUE
        FOR SHARE;
        """,
        (event_type_id,),
        cursor=cursor,
    )

def get_resident_link(user_id, *, cursor):
    return query(
        """
        SELECT id_residente
        FROM residentes
        WHERE id_usuario = %s
        ORDER BY id_residente
        LIMIT 1
        FOR SHARE;
        """,
        (user_id,),
        cursor=cursor,
    )

def lock_space(space_id, *, cursor):
    return query(
        """
        SELECT id_espacio_comun, capacidad, activo
        FROM espacios_comunes
        WHERE id_espacio_comun = %s
        FOR UPDATE;
        """,
        (space_id,),
        cursor=cursor,
    )

def get_policy(space_id, event_type_id, *, cursor):
    return query(
        """
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
        """,
        (space_id, event_type_id),
        cursor=cursor,
    )

def get_current_time(*, cursor):
    return query(
        """
        SELECT
            instante::date AS hoy,
            instante::time AS hora_actual
        FROM (
            SELECT
                clock_timestamp() AT TIME ZONE 'America/Asuncion'
                AS instante
        ) reloj;
        """,
        cursor=cursor,
    )

def get_status(name, *, cursor):
    return query(
        """
        SELECT id_estado_reserva, nombre
        FROM estado_reservas
        WHERE nombre = %s
        ORDER BY id_estado_reserva
        LIMIT 1
        FOR SHARE;
        """,
        (name,),
        cursor=cursor,
    )