-- Datos iniciales y de demostración.
--
-- Requisitos:
--   1. Esquema base instalado.
--   2. Migraciones aplicadas hasta head.
--
-- Comportamiento:
--   - Inserta registros faltantes.
--   - Conserva identificadores y datos existentes.
--   - No reactiva registros desactivados.
--   - No crea usuarios ni contraseñas.
--   - Ante un error, revierte toda la carga.

BEGIN;

SET LOCAL lock_timeout = '10s';

-- Algunas tablas no tienen restricciones únicas por nombre.
-- Estos bloqueos evitan escrituras concurrentes durante la carga.
LOCK TABLE
    roles,
    tipo_edificio,
    tipo_unidad,
    tipos_incidencia,
    estados_incidencia,
    prioridades,
    cargos_personal,
    tipos_evento,
    estado_reservas,
    especialidades,
    edificios,
    unidades,
    espacios_comunes,
    politicas_reserva
IN SHARE ROW EXCLUSIVE MODE;

-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

-- Los catálogos deben tener nombres no ambiguos.
-- No se eliminan ni fusionan duplicados automáticamente.
DO $$
DECLARE
    tabla TEXT;
    nombre_duplicado TEXT;
BEGIN
    FOREACH tabla IN ARRAY ARRAY[
        'roles',
        'tipo_edificio',
        'tipo_unidad',
        'tipos_incidencia',
        'estados_incidencia',
        'prioridades',
        'cargos_personal',
        'tipos_evento',
        'estado_reservas',
        'especialidades'
    ]
    LOOP
        EXECUTE format(
            'SELECT lower(btrim(nombre))
             FROM %I
             GROUP BY lower(btrim(nombre))
             HAVING count(*) > 1
             LIMIT 1',
            tabla
        )
        INTO nombre_duplicado;

        IF nombre_duplicado IS NOT NULL THEN
            RAISE EXCEPTION
                'Nombre duplicado en el catálogo %: %. Corrige los registros antes de ejecutar el seed.',
                tabla,
                nombre_duplicado;
        END IF;
    END LOOP;
END;
$$;

-- El backend utiliza estos nombres como códigos exactos.
-- Una variante con espacios o distinta capitalización no debe
-- impedir silenciosamente la creación del código esperado.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM roles existente
        JOIN (
            VALUES
                ('ADMIN'),
                ('RESIDENTE'),
                ('TECNICO')
        ) AS esperado(nombre)
            ON lower(btrim(existente.nombre)) =
               lower(esperado.nombre)
        WHERE existente.nombre <> esperado.nombre
    ) THEN
        RAISE EXCEPTION
            'Hay roles con nombres no canónicos. Los códigos requeridos son ADMIN, RESIDENTE y TECNICO.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM estados_incidencia existente
        JOIN (
            VALUES
                ('RECIBIDA'),
                ('EN_REVISION'),
                ('ASIGNADA'),
                ('EN_PROCESO'),
                ('EN_ESPERA'),
                ('RESUELTA'),
                ('CERRADA'),
                ('RECHAZADA'),
                ('CANCELADA')
        ) AS esperado(nombre)
            ON lower(btrim(existente.nombre)) =
               lower(esperado.nombre)
        WHERE existente.nombre <> esperado.nombre
    ) THEN
        RAISE EXCEPTION
            'Hay estados de incidencia con espacios o capitalización distintos de los códigos requeridos.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM estado_reservas existente
        JOIN (
            VALUES
                ('PENDIENTE'),
                ('CONFIRMADA'),
                ('RECHAZADA'),
                ('CANCELADA'),
                ('FINALIZADA')
        ) AS esperado(nombre)
            ON lower(btrim(existente.nombre)) =
               lower(esperado.nombre)
        WHERE existente.nombre <> esperado.nombre
    ) THEN
        RAISE EXCEPTION
            'Hay estados de reserva con espacios o capitalización distintos de los códigos requeridos.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM prioridades
        WHERE lower(btrim(nombre)) = 'normal'
          AND nombre <> 'Normal'
    ) THEN
        RAISE EXCEPTION
            'La prioridad predeterminada debe llamarse exactamente Normal.';
    END IF;
END;
$$;

-- ============================================================
-- 2. ROLES
-- ============================================================

INSERT INTO roles (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        (
            'ADMIN',
            'Administra usuarios, edificios, unidades y solicitudes.'
        ),
        (
            'RESIDENTE',
            'Reporta problemas y consulta sus propias solicitudes.'
        ),
        (
            'TECNICO',
            'Personal encargado de mantenimiento y servicios.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM roles existente
    WHERE existente.nombre = datos.nombre
);

-- ============================================================
-- 3. TIPOS DE EDIFICIO
-- ============================================================

INSERT INTO tipo_edificio (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        (
            'Residencial',
            'Edificio destinado principalmente a viviendas.'
        ),
        (
            'Comercial',
            'Edificio destinado principalmente a locales comerciales.'
        ),
        (
            'Mixto',
            'Edificio con viviendas y espacios comerciales.'
        ),
        (
            'Administrativo',
            'Edificio destinado a oficinas y administración.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM tipo_edificio existente
    WHERE lower(btrim(existente.nombre)) =
          lower(btrim(datos.nombre))
);

-- ============================================================
-- 4. TIPOS DE UNIDAD
-- ============================================================

INSERT INTO tipo_unidad (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        (
            'Departamento',
            'Unidad habitacional dentro de un edificio.'
        ),
        (
            'Casa',
            'Vivienda individual dentro del condominio.'
        ),
        (
            'Local comercial',
            'Unidad destinada a actividades comerciales.'
        ),
        (
            'Oficina',
            'Unidad destinada a actividades profesionales.'
        ),
        (
            'Cochera',
            'Unidad destinada al estacionamiento de vehículos.'
        ),
        (
            'Depósito',
            'Unidad destinada al almacenamiento.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM tipo_unidad existente
    WHERE lower(btrim(existente.nombre)) =
          lower(btrim(datos.nombre))
);

-- ============================================================
-- 5. TIPOS DE INCIDENCIA
-- ============================================================

INSERT INTO tipos_incidencia (nombre, descripcion, activo)
SELECT datos.nombre, datos.descripcion, TRUE
FROM (
    VALUES
        (
            'Agua',
            'Pérdidas de agua, cañerías, grifería y suministro.'
        ),
        (
            'Electricidad',
            'Problemas en instalaciones eléctricas e iluminación.'
        ),
        (
            'Desagüe',
            'Obstrucciones, filtraciones y problemas de drenaje.'
        ),
        (
            'Infraestructura',
            'Daños en paredes, techos, pisos y otras estructuras.'
        ),
        (
            'Ascensores',
            'Fallas de funcionamiento en ascensores.'
        ),
        (
            'Accesos',
            'Problemas con puertas, portones, cerraduras e intercomunicadores.'
        ),
        (
            'Limpieza',
            'Necesidades de limpieza y retiro de residuos.'
        ),
        (
            'Áreas verdes',
            'Mantenimiento de jardines, árboles y sistemas de riego.'
        ),
        (
            'Seguridad',
            'Problemas en cámaras, alarmas y otros equipos de seguridad.'
        ),
        (
            'Otros',
            'Otros problemas de mantenimiento.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM tipos_incidencia existente
    WHERE lower(btrim(existente.nombre)) =
          lower(btrim(datos.nombre))
);

-- ============================================================
-- 6. ESTADOS DE INCIDENCIA
-- ============================================================

INSERT INTO estados_incidencia (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        (
            'RECIBIDA',
            'Solicitud recibida y pendiente de revisión.'
        ),
        (
            'EN_REVISION',
            'La administración está evaluando la solicitud.'
        ),
        (
            'ASIGNADA',
            'La solicitud tiene personal responsable asignado.'
        ),
        (
            'EN_PROCESO',
            'Se están realizando trabajos para resolver el problema.'
        ),
        (
            'EN_ESPERA',
            'La atención está pendiente de información, materiales o acceso.'
        ),
        (
            'RESUELTA',
            'Los trabajos finalizaron y el problema fue resuelto.'
        ),
        (
            'CERRADA',
            'Se confirmó el cierre de la solicitud.'
        ),
        (
            'RECHAZADA',
            'La solicitud fue evaluada y no corresponde atenderla.'
        ),
        (
            'CANCELADA',
            'La solicitud fue cancelada.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM estados_incidencia existente
    WHERE existente.nombre = datos.nombre
);

-- ============================================================
-- 7. PRIORIDADES
-- ============================================================

INSERT INTO prioridades (
    nombre,
    nivel,
    tiempo_resolucion_horas,
    activo
)
SELECT
    datos.nombre,
    datos.nivel,
    datos.horas,
    TRUE
FROM (
    VALUES
        ('Baja',    1, 168),
        ('Normal',  2,  72),
        ('Alta',    3,  24),
        ('Urgente', 4,   4)
) AS datos(nombre, nivel, horas)
WHERE NOT EXISTS (
    SELECT 1
    FROM prioridades existente
    WHERE lower(btrim(existente.nombre)) =
          lower(btrim(datos.nombre))
);

-- ============================================================
-- 8. CARGOS DEL PERSONAL
-- ============================================================

INSERT INTO cargos_personal (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        (
            'Encargado de mantenimiento',
            'Coordina y supervisa las tareas de mantenimiento.'
        ),
        (
            'Plomero',
            'Atiende instalaciones de agua, cañerías y desagües.'
        ),
        (
            'Electricista',
            'Atiende instalaciones y equipos eléctricos.'
        ),
        (
            'Técnico de ascensores',
            'Realiza mantenimiento especializado de ascensores.'
        ),
        (
            'Personal de limpieza',
            'Realiza limpieza y gestión de residuos.'
        ),
        (
            'Jardinero',
            'Realiza mantenimiento de jardines y áreas verdes.'
        ),
        (
            'Personal de seguridad',
            'Realiza vigilancia y control de accesos.'
        ),
        (
            'Mantenimiento general',
            'Realiza reparaciones y tareas generales de mantenimiento.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM cargos_personal existente
    WHERE lower(btrim(existente.nombre)) =
          lower(btrim(datos.nombre))
);

-- ============================================================
-- 9. ESPECIALIDADES
-- ============================================================

INSERT INTO especialidades (nombre, descripcion, activo)
SELECT datos.nombre, datos.descripcion, TRUE
FROM (
    VALUES
        (
            'Plomería',
            'Agua, cañerías y desagües.'
        ),
        (
            'Electricidad',
            'Instalaciones eléctricas e iluminación.'
        ),
        (
            'Ascensores',
            'Mantenimiento de ascensores.'
        ),
        (
            'Limpieza',
            'Limpieza y gestión de residuos.'
        ),
        (
            'Jardinería',
            'Mantenimiento de áreas verdes.'
        ),
        (
            'Seguridad',
            'Sistemas de seguridad y accesos.'
        ),
        (
            'Mantenimiento general',
            'Reparaciones generales.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM especialidades existente
    WHERE lower(btrim(existente.nombre)) =
          lower(btrim(datos.nombre))
);

-- ============================================================
-- 10. TIPOS DE EVENTO
-- ============================================================

INSERT INTO tipos_evento (nombre, descripcion, activo)
SELECT datos.nombre, datos.descripcion, TRUE
FROM (
    VALUES
        (
            'Reunión familiar',
            'Encuentro privado de familiares y allegados.'
        ),
        (
            'Cumpleaños',
            'Celebración de cumpleaños.'
        ),
        (
            'Asamblea de residentes',
            'Reunión de residentes para tratar asuntos del condominio.'
        ),
        (
            'Actividad deportiva',
            'Encuentro o actividad deportiva.'
        ),
        (
            'Actividad recreativa',
            'Actividad de entretenimiento o convivencia.'
        ),
        (
            'Otro',
            'Evento que no corresponde a las categorías anteriores.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM tipos_evento existente
    WHERE lower(btrim(existente.nombre)) =
          lower(btrim(datos.nombre))
);

-- ============================================================
-- 11. ESTADOS DE RESERVA
-- ============================================================

INSERT INTO estado_reservas (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        (
            'PENDIENTE',
            'Reserva solicitada y pendiente de evaluación.'
        ),
        (
            'CONFIRMADA',
            'La solicitud de reserva fue aprobada.'
        ),
        (
            'RECHAZADA',
            'La solicitud de reserva no fue aprobada.'
        ),
        (
            'CANCELADA',
            'La reserva fue cancelada.'
        ),
        (
            'FINALIZADA',
            'El uso reservado del espacio finalizó.'
        )
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM estado_reservas existente
    WHERE existente.nombre = datos.nombre
);

-- ============================================================
-- 12. EDIFICIOS DE DEMOSTRACIÓN
-- ============================================================

-- Los edificios se identifican por su nombre dentro de este seed.
DO $$
BEGIN
    IF EXISTS (
        SELECT lower(btrim(nombre))
        FROM edificios
        WHERE lower(btrim(nombre)) IN (
            'torre norte',
            'torre sur'
        )
        GROUP BY lower(btrim(nombre))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay varios edificios llamados Torre Norte o Torre Sur. No se pueden resolver sus relaciones de forma inequívoca.';
    END IF;
END;
$$;

INSERT INTO edificios (
    nombre,
    direccion,
    created_at,
    id_tipo_edificio
)
SELECT
    datos.nombre,
    datos.direccion,
    CURRENT_TIMESTAMP,
    te.id_tipo_edificio
FROM (
    VALUES
        ('Torre Norte', 'Av. de la Integración 1200'),
        ('Torre Sur', 'Av. de la Integración 1250')
) AS datos(nombre, direccion)
JOIN tipo_edificio te
    ON lower(btrim(te.nombre)) = 'residencial'
WHERE NOT EXISTS (
    SELECT 1
    FROM edificios existente
    WHERE lower(btrim(existente.nombre)) =
          lower(btrim(datos.nombre))
);

-- ============================================================
-- 13. UNIDADES DE DEMOSTRACIÓN
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT u.id_edificio, lower(btrim(u.codigo))
        FROM unidades u
        JOIN edificios e
            ON e.id_edificio = u.id_edificio
        WHERE lower(btrim(e.nombre)) IN (
            'torre norte',
            'torre sur'
        )
          AND lower(btrim(u.codigo)) IN (
              '101', '102', '201', '202', '301', '302'
          )
        GROUP BY u.id_edificio, lower(btrim(u.codigo))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay códigos de unidades de demostración duplicados dentro de un edificio.';
    END IF;
END;
$$;

INSERT INTO unidades (
    codigo,
    piso,
    created_at,
    id_edificio,
    id_tipo_unidad
)
SELECT
    datos.codigo,
    datos.piso,
    CURRENT_TIMESTAMP,
    e.id_edificio,
    tu.id_tipo_unidad
FROM (
    VALUES
        ('101', '1'),
        ('102', '1'),
        ('201', '2'),
        ('202', '2'),
        ('301', '3'),
        ('302', '3')
) AS datos(codigo, piso)
CROSS JOIN edificios e
JOIN tipo_unidad tu
    ON lower(btrim(tu.nombre)) = 'departamento'
WHERE lower(btrim(e.nombre)) IN (
    'torre norte',
    'torre sur'
)
  AND NOT EXISTS (
      SELECT 1
      FROM unidades existente
      WHERE existente.id_edificio = e.id_edificio
        AND lower(btrim(existente.codigo)) =
            lower(btrim(datos.codigo))
  );

-- ============================================================
-- 14. ESPACIOS COMUNES DE DEMOSTRACIÓN
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT ec.id_edificio, lower(btrim(ec.nombre))
        FROM espacios_comunes ec
        JOIN edificios e
            ON e.id_edificio = ec.id_edificio
        WHERE lower(btrim(e.nombre)) IN (
            'torre norte',
            'torre sur'
        )
          AND lower(btrim(ec.nombre)) IN (
              'salón de eventos',
              'terraza con parrilla',
              'gimnasio'
          )
        GROUP BY ec.id_edificio, lower(btrim(ec.nombre))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay espacios comunes de demostración duplicados dentro de un edificio.';
    END IF;
END;
$$;

INSERT INTO espacios_comunes (
    nombre,
    descripcion,
    capacidad,
    activo,
    id_edificio
)
SELECT
    datos.nombre,
    datos.descripcion,
    datos.capacidad,
    TRUE,
    e.id_edificio
FROM (
    VALUES
        (
            'Salón de eventos',
            'Espacio para reuniones y celebraciones de residentes.',
            40
        ),
        (
            'Terraza con parrilla',
            'Terraza equipada para reuniones familiares.',
            20
        ),
        (
            'Gimnasio',
            'Espacio para actividades físicas de los residentes.',
            15
        )
) AS datos(nombre, descripcion, capacidad)
CROSS JOIN edificios e
WHERE lower(btrim(e.nombre)) IN (
    'torre norte',
    'torre sur'
)
  AND NOT EXISTS (
      SELECT 1
      FROM espacios_comunes existente
      WHERE existente.id_edificio = e.id_edificio
        AND lower(btrim(existente.nombre)) =
            lower(btrim(datos.nombre))
  );

-- ============================================================
-- 15. POLÍTICAS DE RESERVA DE DEMOSTRACIÓN
-- ============================================================

-- Las tarifas se conservan respecto al seed anterior.
-- Solo se crean políticas para espacios y eventos activos.
-- Las políticas existentes no se modifican.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM espacios_comunes ec
        JOIN edificios e
            ON e.id_edificio = ec.id_edificio
        WHERE lower(btrim(e.nombre)) IN (
            'torre norte',
            'torre sur'
        )
          AND lower(btrim(ec.nombre)) IN (
              'salón de eventos',
              'terraza con parrilla',
              'gimnasio'
          )
          AND ec.activo
          AND ec.capacidad < 1
    ) THEN
        RAISE EXCEPTION
            'Un espacio activo de demostración tiene una capacidad menor que uno.';
    END IF;
END;
$$;

INSERT INTO politicas_reserva (
    dias_anticipacion_min,
    dias_anticipacion_max,
    duracion_max_horas,
    hora_apertura,
    hora_cierre,
    costo,
    aforo_maximo,
    deposito_garantia,
    penalizaciones,
    id_espacio_comun,
    id_tipo_evento
)
SELECT
    datos.dias_min,
    datos.dias_max,
    datos.duracion,
    datos.apertura::TIME,
    datos.cierre::TIME,
    datos.costo,
    LEAST(datos.aforo, ec.capacidad),
    datos.deposito,
    datos.penalizacion,
    ec.id_espacio_comun,
    te.id_tipo_evento
FROM (
    VALUES
        (
            'Salón de eventos',
            1, 30, 5,
            '08:00', '22:00',
            50000, 40, 100000, 20000
        ),
        (
            'Terraza con parrilla',
            1, 15, 4,
            '09:00', '21:00',
            30000, 20, 60000, 15000
        ),
        (
            'Gimnasio',
            1, 7, 2,
            '07:00', '20:00',
            20000, 15, 40000, 10000
        )
) AS datos(
    espacio,
    dias_min,
    dias_max,
    duracion,
    apertura,
    cierre,
    costo,
    aforo,
    deposito,
    penalizacion
)
JOIN espacios_comunes ec
    ON lower(btrim(ec.nombre)) =
       lower(btrim(datos.espacio))
JOIN edificios e
    ON e.id_edificio = ec.id_edificio
CROSS JOIN tipos_evento te
WHERE lower(btrim(e.nombre)) IN (
    'torre norte',
    'torre sur'
)
  AND ec.activo
  AND te.activo
  AND lower(btrim(te.nombre)) IN (
      'reunión familiar',
      'cumpleaños',
      'asamblea de residentes',
      'actividad deportiva',
      'actividad recreativa',
      'otro'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM politicas_reserva existente
      WHERE existente.id_espacio_comun = ec.id_espacio_comun
        AND existente.id_tipo_evento = te.id_tipo_evento
  );

COMMIT;