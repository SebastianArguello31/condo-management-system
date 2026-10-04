from werkzeug.exceptions import BadRequest, Conflict, NotFound

from app.core.db_helpers import query, transaction, update_record

ESPACIO_SELECT = """
    SELECT
        ec.id_espacio_comun,
        ec.nombre,
        ec.descripcion,
        ec.capacidad,
        ec.activo,
        ec.id_edificio,
        e.nombre AS edificio
    FROM espacios_comunes ec
    JOIN edificios e
        ON e.id_edificio = ec.id_edificio
"""

POLITICA_SELECT = """
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
        pr.deposito_garantia::TEXT AS deposito_garantia
    FROM politicas_reserva pr
    JOIN tipos_evento te
        ON te.id_tipo_evento = pr.id_tipo_evento
"""

def list_espacios(rol):
    statement = ESPACIO_SELECT

    if rol != "ADMIN":
        statement += " WHERE ec.activo = TRUE"

    statement += " ORDER BY ec.id_espacio_comun;"

    return query(statement, many=True)

def get_espacio(espacio_id):
    return query(
        ESPACIO_SELECT + " WHERE ec.id_espacio_comun = %s;",
        (espacio_id,),
    )

def create_espacio(data):
    with transaction() as cursor:
        cursor.execute("""
            INSERT INTO espacios_comunes (
                nombre, descripcion, capacidad, id_edificio
            )
            VALUES (%s, %s, %s, %s)
            RETURNING id_espacio_comun;
        """, (
            data["nombre"],
            data.get("descripcion"),
            data["capacidad"],
            data["id_edificio"],
        ))

        espacio_id = cursor.fetchone()["id_espacio_comun"]

    return get_espacio(espacio_id)

def update_espacio(espacio_id, data):
    return update_record(
        "espacios_comunes",
        "id_espacio_comun",
        espacio_id,
        data,
        {"nombre", "descripcion", "capacidad", "activo"},
    )

def get_disponibilidad(espacio_id, fecha_inicio, fecha_fin, id_tipo_evento=None):
    espacio = get_espacio(espacio_id)

    if not espacio:
        raise NotFound("Espacio no encontrado")

    if fecha_fin < fecha_inicio:
        raise BadRequest("La fecha fin no puede ser anterior a la fecha inicio")

    if (fecha_fin - fecha_inicio).days > 31:
        raise BadRequest("El rango de fechas no puede superar 31 días")

    if id_tipo_evento:
        politicas = query(
            POLITICA_SELECT + """
                WHERE pr.id_espacio_comun = %s
                  AND pr.id_tipo_evento = %s
                ORDER BY te.nombre;
            """,
            (espacio_id, id_tipo_evento),
            many=True,
        )

        if not politicas:
            raise Conflict(
                "Sin política configurada para este espacio y tipo de evento"
            )
    else:
        politicas = query(
            POLITICA_SELECT + """
                WHERE pr.id_espacio_comun = %s
                ORDER BY te.nombre;
            """,
            (espacio_id,),
            many=True,
        )

    tramos_ocupados = query("""
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
        ORDER BY r.fecha, r.hora_inicio;
    """, (espacio_id, fecha_inicio, fecha_fin), many=True)

    return {
        "espacio": espacio,
        "fecha_inicio": fecha_inicio.isoformat(),
        "fecha_fin": fecha_fin.isoformat(),
        "politicas": politicas,
        "tramos_ocupados": tramos_ocupados,
    }
