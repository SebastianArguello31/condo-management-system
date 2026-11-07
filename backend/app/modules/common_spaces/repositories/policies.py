from app.core.db_helpers import query

POLICY_SELECT = """
    SELECT
        pr.id_politica_reserva,
        pr.id_tipo_evento,
        te.nombre AS tipo_evento,
        to_char(pr.hora_apertura, 'HH24:MI') AS hora_apertura,
        to_char(pr.hora_cierre, 'HH24:MI') AS hora_cierre,
        pr.duracion_max_horas,
        pr.dias_anticipacion_min,
        pr.dias_anticipacion_max,
        pr.aforo_maximo,
        pr.costo::TEXT AS costo,
        pr.deposito_garantia::TEXT AS deposito_garantia,
        pr.penalizaciones::TEXT AS penalizaciones
    FROM politicas_reserva pr
    JOIN tipos_evento te ON te.id_tipo_evento = pr.id_tipo_evento
"""

def list_policies(space_id, event_type_id=None, *, cursor):
    statement = (POLICY_SELECT + " WHERE pr.id_espacio_comun = %s")
    params = [space_id]

    if event_type_id is not None:
        statement += " AND pr.id_tipo_evento = %s"
        params.append(event_type_id)

    statement += " ORDER BY te.nombre, pr.id_politica_reserva"

    return query(statement, tuple(params), many=True, cursor=cursor)

def get_max_policy_capacity(space_id, *, cursor):
    result = query(
        """
        SELECT COALESCE(MAX(aforo_maximo), 0) AS aforo
        FROM politicas_reserva
        WHERE id_espacio_comun = %s;
        """,
        (space_id,),
        cursor=cursor,
    )

    return result["aforo"]

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

def save_policy(space_id, data, policy_id=None, *, cursor):
    params = (
        data["id_tipo_evento"],
        data["hora_apertura"],
        data["hora_cierre"],
        data["duracion_max_horas"],
        data["dias_anticipacion_min"],
        data["dias_anticipacion_max"],
        data["aforo_maximo"],
        data["costo"],
        data["deposito_garantia"],
        data["penalizaciones"],
        space_id,
    )

    if policy_id is None:
        return query(
            """
            INSERT INTO politicas_reserva (
                id_tipo_evento,
                hora_apertura,
                hora_cierre,
                duracion_max_horas,
                dias_anticipacion_min,
                dias_anticipacion_max,
                aforo_maximo,
                costo,
                deposito_garantia,
                penalizaciones,
                id_espacio_comun
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_politica_reserva;
            """,
            params,
            cursor=cursor,
        )

    return query(
        """
        UPDATE politicas_reserva
        SET id_tipo_evento = %s,
            hora_apertura = %s,
            hora_cierre = %s,
            duracion_max_horas = %s,
            dias_anticipacion_min = %s,
            dias_anticipacion_max = %s,
            aforo_maximo = %s,
            costo = %s,
            deposito_garantia = %s,
            penalizaciones = %s
        WHERE id_espacio_comun = %s
          AND id_politica_reserva = %s
        RETURNING id_politica_reserva;
        """,
        (*params, policy_id),
        cursor=cursor,
    )

def delete_policy(space_id, policy_id, *, cursor):
    return query(
        """
        DELETE FROM politicas_reserva
        WHERE id_espacio_comun = %s
          AND id_politica_reserva = %s
        RETURNING id_politica_reserva;
        """,
        (space_id, policy_id),
        cursor=cursor,
    )