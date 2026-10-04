from datetime import datetime

from werkzeug.exceptions import Conflict, Forbidden, NotFound

from app.core.db_helpers import query, transaction

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
        r.id_tipo_evento,
        te.nombre AS tipo_evento,
        r.id_estado_reserva,
        er.nombre AS estado
    FROM reservas r
    JOIN espacios_comunes ec
        ON ec.id_espacio_comun = r.id_espacio_comun
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
