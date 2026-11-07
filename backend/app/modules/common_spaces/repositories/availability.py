from app.core.db_helpers import query

def list_occupied_slots(space_id, start_date, end_date, *, cursor):
    return query(
        """
        SELECT
            r.id_reserva,
            to_char(r.fecha, 'YYYY-MM-DD') AS fecha,
            to_char(r.hora_inicio, 'HH24:MI') AS hora_inicio,
            to_char(r.hora_fin, 'HH24:MI') AS hora_fin,
            er.nombre AS estado
        FROM reservas r
        JOIN estado_reservas er
            ON er.id_estado_reserva = r.id_estado_reserva
        WHERE r.id_espacio_comun = %s
            AND r.fecha BETWEEN %s AND %s
            AND er.nombre IN ('PENDIENTE', 'CONFIRMADA')
        ORDER BY r.fecha, r.hora_inicio, r.id_reserva;
        """,
        (space_id, start_date, end_date),
        many=True,
        cursor=cursor,
    )