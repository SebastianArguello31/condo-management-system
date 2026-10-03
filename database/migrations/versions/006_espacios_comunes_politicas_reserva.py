"""Siembra espacios comunes demo, sus politicas de reserva y agrega UNIQUE (espacio, tipo)."""

from alembic import op


revision = "s3_006_espacios_politicas"
down_revision = "s3_005_asignaciones_incidencia"
branch_labels = None
depends_on = None


def upgrade():
    # UNIQUE de politicas por (espacio, tipo de evento).
    op.create_index(
        "uq_politicas_reserva_espacio_tipo",
        "politicas_reserva",
        ["id_espacio_comun", "id_tipo_evento"],
        unique=True,
    )

    # Edificio de respaldo solo si la base no tiene ninguno.
    op.execute("""
        INSERT INTO edificios (nombre, direccion, created_at, id_tipo_edificio)
        SELECT 'Edificio Principal', 'Dirección pendiente', CURRENT_TIMESTAMP, te.id_tipo_edificio
        FROM tipo_edificio te
        WHERE te.nombre = 'Residencial'
          AND NOT EXISTS (SELECT 1 FROM edificios)
        ORDER BY te.id_tipo_edificio
        LIMIT 1;
    """)

    # Espacios comunes demo, en el edificio de menor id.
    op.execute("""
        INSERT INTO espacios_comunes (nombre, descripcion, capacidad, activo, id_edificio)
        SELECT datos.nombre, datos.descripcion, datos.capacidad, TRUE, e.id_edificio
        FROM (
            VALUES
                ('Salón Comunal', 'Salón para eventos y reuniones de residentes.', 50),
                ('Parrillera', 'Área con parrillas para reuniones familiares.', 30),
                ('Cancha deportiva', 'Cancha multiuso al aire libre.', 20)
        ) AS datos(nombre, descripcion, capacidad)
        CROSS JOIN (
            SELECT id_edificio
            FROM edificios
            ORDER BY id_edificio
            LIMIT 1
        ) e
        WHERE NOT EXISTS (
            SELECT 1
            FROM espacios_comunes existente
            WHERE existente.nombre = datos.nombre
        );
    """)

    # Politicas de reserva: espacios demo por cada tipo de evento activo.
    op.execute("""
        INSERT INTO politicas_reserva (
            dias_anticipacion_min, dias_anticipacion_max, duracion_max_horas,
            hora_apertura, hora_cierre, costo, aforo_maximo,
            deposito_garantia, penalizaciones, id_espacio_comun, id_tipo_evento
        )
        SELECT datos.dias_min, datos.dias_max, datos.duracion_max,
               datos.apertura::TIME, datos.cierre::TIME,
               datos.costo, datos.aforo, datos.deposito, datos.penalizacion,
               ec.id_espacio_comun, te.id_tipo_evento
        FROM (
            VALUES
                ('Salón Comunal', 1, 30, 5, '08:00', '22:00', 50000, 45, 100000, 20000),
                ('Parrillera', 1, 15, 4, '09:00', '21:00', 30000, 25, 60000, 15000),
                ('Cancha deportiva', 1, 7, 2, '07:00', '20:00', 20000, 20, 40000, 10000)
        ) AS datos(espacio, dias_min, dias_max, duracion_max, apertura, cierre,
                   costo, aforo, deposito, penalizacion)
        JOIN espacios_comunes ec ON ec.nombre = datos.espacio
        CROSS JOIN tipos_evento te
        WHERE te.activo = TRUE
          AND NOT EXISTS (
              SELECT 1
              FROM politicas_reserva pr
              WHERE pr.id_espacio_comun = ec.id_espacio_comun
                AND pr.id_tipo_evento = te.id_tipo_evento
          );
    """)


def downgrade():
    op.execute("""
        DELETE FROM politicas_reserva
        WHERE id_espacio_comun IN (
            SELECT id_espacio_comun
            FROM espacios_comunes
            WHERE nombre IN ('Salón Comunal', 'Parrillera', 'Cancha deportiva')
        );
    """)
    op.execute("""
        DELETE FROM espacios_comunes
        WHERE nombre IN ('Salón Comunal', 'Parrillera', 'Cancha deportiva')
          AND NOT EXISTS (
              SELECT 1 FROM reservas r
              WHERE r.id_espacio_comun = espacios_comunes.id_espacio_comun
          )
          AND NOT EXISTS (
              SELECT 1 FROM incidencias i
              WHERE i.id_espacio_comun = espacios_comunes.id_espacio_comun
          );
    """)
    op.execute("""
        DELETE FROM edificios
        WHERE nombre = 'Edificio Principal'
          AND direccion = 'Dirección pendiente'
          AND NOT EXISTS (
              SELECT 1 FROM unidades u
              WHERE u.id_edificio = edificios.id_edificio
          )
          AND NOT EXISTS (
              SELECT 1 FROM espacios_comunes ec
              WHERE ec.id_edificio = edificios.id_edificio
          );
    """)
    op.drop_index(
        "uq_politicas_reserva_espacio_tipo",
        table_name="politicas_reserva",
    )
