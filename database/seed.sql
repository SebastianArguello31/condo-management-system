-- ============================================================
-- SEED COMPLETO - SISTEMA DE GESTIÓN DE CONDOMINIOS
--
-- Requisitos:
--   schema.sql instalado y migraciones aplicadas hasta head.
--   Head revisado: f3499c9b0871.
--
-- Incluye:
--   Roles ADMIN, GESTOR, RESIDENTE y TECNICO.
--   Catálogos de edificios, unidades, incidencias y reservas.
--   Cargos, especialidades y categorías de insumos.
--   Edificios, unidades, espacios y políticas de demostración.
--   Insumos de demostración con stock cero.
--
-- Conserva los registros existentes y sus identificadores.
-- No modifica contraseñas, sesiones ni registros operativos.
-- No reactiva registros desactivados.
-- Costos y tarifas de demostración expresados en guaraníes.
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '10s';

-- ============================================================
-- 1. VERIFICAR MIGRACIONES
-- ============================================================

DO $$
BEGIN
    IF to_regclass('alembic_version') IS NULL THEN
        RAISE EXCEPTION
            'Falta alembic_version. Aplica las migraciones antes del seed.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM alembic_version
        WHERE version_num = 'f3499c9b0871'
    ) THEN
        RAISE EXCEPTION
            'Este seed requiere el head f3499c9b0871. Ejecuta alembic upgrade head.';
    END IF;
END;
$$;

-- Evita inserciones concurrentes mientras se resuelven nombres.
LOCK TABLE
    roles,
    tipo_edificio,
    tipo_unidad,
    tipos_incidencia,
    estados_incidencia,
    prioridades,
    cargos_personal,
    especialidades,
    tipos_evento,
    estado_reservas,
    categorias_insumo,
    edificios,
    unidades,
    espacios_comunes,
    politicas_reserva,
    insumos
IN SHARE ROW EXCLUSIVE MODE;

-- ============================================================
-- 2. CATÁLOGOS
-- Tabla temporal: desaparece al confirmar la transacción.
-- ============================================================

CREATE TEMP TABLE seed_catalogos (
    tabla TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    PRIMARY KEY (tabla, nombre)
) ON COMMIT DROP;

INSERT INTO seed_catalogos (tabla, nombre, descripcion)
VALUES
    -- ROLES
    ('roles', 'ADMIN',
     'Administra usuarios, configuración y operaciones del sistema.'),
    ('roles', 'GESTOR',
     'Gestiona asignaciones de mantenimiento, inventario y reservas; consulta indicadores según los permisos del backend.'),
    ('roles', 'RESIDENTE',
     'Reporta incidencias y gestiona sus propias solicitudes y reservas.'),
    ('roles', 'TECNICO',
     'Atiende incidencias asignadas y registra trabajos de mantenimiento.'),

    -- TIPOS DE EDIFICIO
    ('tipo_edificio', 'Residencial',
     'Edificio destinado principalmente a viviendas.'),
    ('tipo_edificio', 'Comercial',
     'Edificio destinado principalmente a locales comerciales.'),
    ('tipo_edificio', 'Mixto',
     'Edificio con viviendas y espacios comerciales.'),
    ('tipo_edificio', 'Administrativo',
     'Edificio destinado a oficinas y administración.'),

    -- TIPOS DE UNIDAD
    ('tipo_unidad', 'Departamento',
     'Unidad habitacional dentro de un edificio.'),
    ('tipo_unidad', 'Casa',
     'Vivienda individual dentro del condominio.'),
    ('tipo_unidad', 'Local comercial',
     'Unidad destinada a actividades comerciales.'),
    ('tipo_unidad', 'Oficina',
     'Unidad destinada a actividades profesionales.'),
    ('tipo_unidad', 'Cochera',
     'Unidad destinada al estacionamiento de vehículos.'),
    ('tipo_unidad', 'Depósito',
     'Unidad destinada al almacenamiento.'),

    -- TIPOS DE INCIDENCIA
    ('tipos_incidencia', 'Agua',
     'Pérdidas de agua, cañerías, grifería y suministro.'),
    ('tipos_incidencia', 'Electricidad',
     'Problemas en instalaciones eléctricas e iluminación.'),
    ('tipos_incidencia', 'Desagüe',
     'Obstrucciones, filtraciones y problemas de drenaje.'),
    ('tipos_incidencia', 'Infraestructura',
     'Daños en paredes, techos, pisos y estructuras.'),
    ('tipos_incidencia', 'Ascensores',
     'Fallas de funcionamiento en ascensores.'),
    ('tipos_incidencia', 'Accesos',
     'Problemas con puertas, portones, cerraduras e intercomunicadores.'),
    ('tipos_incidencia', 'Limpieza',
     'Necesidades de limpieza y retiro de residuos.'),
    ('tipos_incidencia', 'Áreas verdes',
     'Mantenimiento de jardines, árboles y sistemas de riego.'),
    ('tipos_incidencia', 'Seguridad',
     'Problemas en cámaras, alarmas y equipos de seguridad.'),
    ('tipos_incidencia', 'Otros',
     'Otros problemas de mantenimiento.'),

    -- ESTADOS DE INCIDENCIA
    ('estados_incidencia', 'RECIBIDA',
     'Solicitud recibida y pendiente de revisión.'),
    ('estados_incidencia', 'EN_REVISION',
     'La administración está evaluando la solicitud.'),
    ('estados_incidencia', 'ASIGNADA',
     'La solicitud tiene personal responsable asignado.'),
    ('estados_incidencia', 'EN_PROCESO',
     'Se están realizando trabajos para resolver el problema.'),
    ('estados_incidencia', 'EN_ESPERA',
     'Pendiente de información, materiales o acceso.'),
    ('estados_incidencia', 'RESUELTA',
     'Los trabajos finalizaron y el problema fue resuelto.'),
    ('estados_incidencia', 'CERRADA',
     'Se confirmó el cierre de la solicitud.'),
    ('estados_incidencia', 'RECHAZADA',
     'La solicitud fue evaluada y no corresponde atenderla.'),
    ('estados_incidencia', 'CANCELADA',
     'La solicitud fue cancelada.'),

    -- CARGOS DEL PERSONAL
    -- Los cargos no conceden permisos: estos dependen del rol.
    ('cargos_personal', 'Encargado de mantenimiento',
     'Coordina y supervisa las tareas de mantenimiento.'),
    ('cargos_personal', 'Plomero',
     'Atiende instalaciones de agua, cañerías y desagües.'),
    ('cargos_personal', 'Electricista',
     'Atiende instalaciones y equipos eléctricos.'),
    ('cargos_personal', 'Técnico de ascensores',
     'Realiza mantenimiento especializado de ascensores.'),
    ('cargos_personal', 'Personal de limpieza',
     'Realiza limpieza y gestión de residuos.'),
    ('cargos_personal', 'Jardinero',
     'Realiza mantenimiento de jardines y áreas verdes.'),
    ('cargos_personal', 'Personal de seguridad',
     'Realiza vigilancia y control de accesos.'),
    ('cargos_personal', 'Mantenimiento general',
     'Realiza reparaciones generales de mantenimiento.'),

    -- ESPECIALIDADES: MIGRACIÓN 003
    ('especialidades', 'Plomería',
     'Agua, cañerías y desagües.'),
    ('especialidades', 'Electricidad',
     'Instalaciones eléctricas e iluminación.'),
    ('especialidades', 'Ascensores',
     'Mantenimiento de ascensores.'),
    ('especialidades', 'Limpieza',
     'Limpieza y gestión de residuos.'),
    ('especialidades', 'Jardinería',
     'Mantenimiento de áreas verdes.'),
    ('especialidades', 'Seguridad',
     'Sistemas de seguridad y accesos.'),
    ('especialidades', 'Mantenimiento general',
     'Reparaciones generales.'),

    -- TIPOS DE EVENTO
    ('tipos_evento', 'Reunión familiar',
     'Encuentro privado de familiares y allegados.'),
    ('tipos_evento', 'Cumpleaños',
     'Celebración de cumpleaños.'),
    ('tipos_evento', 'Asamblea de residentes',
     'Reunión para tratar asuntos del condominio.'),
    ('tipos_evento', 'Actividad deportiva',
     'Encuentro o actividad deportiva.'),
    ('tipos_evento', 'Actividad recreativa',
     'Actividad de entretenimiento o convivencia.'),
    ('tipos_evento', 'Otro',
     'Evento que no corresponde a las categorías anteriores.'),

    -- ESTADOS DE RESERVA
    ('estado_reservas', 'PENDIENTE',
     'Reserva solicitada y pendiente de evaluación.'),
    ('estado_reservas', 'CONFIRMADA',
     'La solicitud de reserva fue aprobada.'),
    ('estado_reservas', 'RECHAZADA',
     'La solicitud de reserva no fue aprobada.'),
    ('estado_reservas', 'CANCELADA',
     'La reserva fue cancelada.'),
    ('estado_reservas', 'FINALIZADA',
     'El uso reservado del espacio finalizó.'),

    -- CATEGORÍAS DE INSUMOS: MIGRACIÓN 010 DE INVENTARIO
    ('categorias_insumo', 'GENERAL',
     'Insumos de uso general.'),
    ('categorias_insumo', 'PLOMERIA',
     'Materiales para agua, cañerías y desagües.'),
    ('categorias_insumo', 'ELECTRICIDAD',
     'Materiales eléctricos e iluminación.'),
    ('categorias_insumo', 'LIMPIEZA',
     'Productos y materiales de limpieza.'),
    ('categorias_insumo', 'JARDINERIA',
     'Materiales para jardines y áreas verdes.'),
    ('categorias_insumo', 'PINTURA',
     'Pinturas y materiales para acabados.'),
    ('categorias_insumo', 'FERRETERIA',
     'Elementos de fijación, sellado y reparación.'),
    ('categorias_insumo', 'SEGURIDAD',
     'Materiales para sistemas de seguridad.'),
    ('categorias_insumo', 'PROTECCION PERSONAL',
     'Elementos de protección para el personal.');

-- Validar nombres e insertar únicamente registros faltantes.
DO $$
DECLARE
    v_tabla TEXT;
    v_duplicado TEXT;
    v_no_canonico TEXT;
    v_tiene_activo BOOLEAN;
BEGIN
    FOR v_tabla IN
        SELECT DISTINCT tabla
        FROM seed_catalogos
        ORDER BY tabla
    LOOP
        EXECUTE format(
            'SELECT lower(btrim(nombre))
             FROM %I
             GROUP BY lower(btrim(nombre))
             HAVING count(*) > 1
             LIMIT 1',
            v_tabla
        )
        INTO v_duplicado;

        IF v_duplicado IS NOT NULL THEN
            RAISE EXCEPTION
                'Nombre duplicado en %: %. Corrige el catálogo.',
                v_tabla, v_duplicado;
        END IF;

        -- El backend compara estos códigos de forma exacta.
        IF v_tabla IN (
            'roles',
            'estados_incidencia',
            'estado_reservas'
        ) THEN
            EXECUTE format(
                'SELECT e.nombre
                 FROM %I e
                 JOIN pg_temp.seed_catalogos d
                   ON lower(btrim(e.nombre)) = lower(btrim(d.nombre))
                 WHERE d.tabla = $1
                   AND e.nombre <> d.nombre
                 LIMIT 1',
                v_tabla
            )
            INTO v_no_canonico
            USING v_tabla;

            IF v_no_canonico IS NOT NULL THEN
                RAISE EXCEPTION
                    'Código no canónico en %: %. Revisa espacios y mayúsculas.',
                    v_tabla, v_no_canonico;
            END IF;
        END IF;

        v_tiene_activo := v_tabla IN (
            'tipos_incidencia',
            'especialidades',
            'tipos_evento',
            'categorias_insumo'
        );

        IF v_tiene_activo THEN
            EXECUTE format(
                'INSERT INTO %I (nombre, descripcion, activo)
                 SELECT d.nombre, d.descripcion, TRUE
                 FROM pg_temp.seed_catalogos d
                 WHERE d.tabla = $1
                   AND NOT EXISTS (
                       SELECT 1 FROM %I e
                       WHERE lower(btrim(e.nombre)) =
                             lower(btrim(d.nombre))
                   )',
                v_tabla, v_tabla
            )
            USING v_tabla;
        ELSE
            EXECUTE format(
                'INSERT INTO %I (nombre, descripcion)
                 SELECT d.nombre, d.descripcion
                 FROM pg_temp.seed_catalogos d
                 WHERE d.tabla = $1
                   AND NOT EXISTS (
                       SELECT 1 FROM %I e
                       WHERE lower(btrim(e.nombre)) =
                             lower(btrim(d.nombre))
                   )',
                v_tabla, v_tabla
            )
            USING v_tabla;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- 3. PRIORIDADES
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT lower(btrim(nombre))
        FROM prioridades
        GROUP BY lower(btrim(nombre))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Hay prioridades con nombres duplicados.';
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

INSERT INTO prioridades (
    nombre, nivel, tiempo_resolucion_horas, activo
)
SELECT d.nombre, d.nivel, d.horas, TRUE
FROM (
    VALUES
        ('Baja',    1, 168),
        ('Normal',  2,  72),
        ('Alta',    3,  24),
        ('Urgente', 4,   4)
) AS d(nombre, nivel, horas)
WHERE NOT EXISTS (
    SELECT 1
    FROM prioridades p
    WHERE lower(btrim(p.nombre)) = lower(btrim(d.nombre))
);

-- ============================================================
-- 4. EDIFICIOS DE DEMOSTRACIÓN
-- Se conservan los edificios creados por la migración 006.
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT lower(btrim(nombre))
        FROM edificios
        WHERE lower(btrim(nombre)) IN ('torre norte', 'torre sur')
        GROUP BY lower(btrim(nombre))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay edificios duplicados llamados Torre Norte o Torre Sur.';
    END IF;
END;
$$;

INSERT INTO edificios (
    nombre, direccion, created_at, id_tipo_edificio
)
SELECT
    d.nombre,
    d.direccion,
    CURRENT_TIMESTAMP,
    t.id_tipo_edificio
FROM (
    VALUES
        ('Torre Norte', 'Av. de la Integración 1200'),
        ('Torre Sur', 'Av. de la Integración 1250')
) AS d(nombre, direccion)
JOIN tipo_edificio t
    ON lower(btrim(t.nombre)) = 'residencial'
WHERE NOT EXISTS (
    SELECT 1
    FROM edificios e
    WHERE lower(btrim(e.nombre)) = lower(btrim(d.nombre))
);

-- ============================================================
-- 5. UNIDADES DE DEMOSTRACIÓN
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT u.id_edificio, lower(btrim(u.codigo))
        FROM unidades u
        JOIN edificios e ON e.id_edificio = u.id_edificio
        WHERE lower(btrim(e.nombre)) IN ('torre norte', 'torre sur')
          AND lower(btrim(u.codigo)) IN (
              '101', '102', '201', '202', '301', '302'
          )
        GROUP BY u.id_edificio, lower(btrim(u.codigo))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay unidades de demostración duplicadas dentro de un edificio.';
    END IF;
END;
$$;

INSERT INTO unidades (
    codigo, piso, created_at, id_edificio, id_tipo_unidad
)
SELECT
    d.codigo,
    d.piso,
    CURRENT_TIMESTAMP,
    e.id_edificio,
    t.id_tipo_unidad
FROM (
    VALUES
        ('101', '1'),
        ('102', '1'),
        ('201', '2'),
        ('202', '2'),
        ('301', '3'),
        ('302', '3')
) AS d(codigo, piso)
CROSS JOIN edificios e
JOIN tipo_unidad t
    ON lower(btrim(t.nombre)) = 'departamento'
WHERE lower(btrim(e.nombre)) IN ('torre norte', 'torre sur')
  AND NOT EXISTS (
      SELECT 1
      FROM unidades u
      WHERE u.id_edificio = e.id_edificio
        AND lower(btrim(u.codigo)) = lower(btrim(d.codigo))
  );

-- ============================================================
-- 6. ESPACIOS COMUNES Y POLÍTICAS DE RESERVA
-- Compatible con la unicidad (espacio, evento) de migración 006.
-- Las políticas existentes conservan sus valores.
-- ============================================================

CREATE TEMP TABLE seed_espacios (
    nombre TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    capacidad INTEGER NOT NULL,
    dias_min INTEGER NOT NULL,
    dias_max INTEGER NOT NULL,
    duracion INTEGER NOT NULL,
    apertura TIME NOT NULL,
    cierre TIME NOT NULL,
    costo NUMERIC NOT NULL,
    deposito NUMERIC NOT NULL,
    penalizacion NUMERIC NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_espacios
VALUES
    (
        'Salón de eventos',
        'Espacio para reuniones y celebraciones de residentes.',
        40, 1, 30, 5, '08:00', '22:00',
        50000, 100000, 20000
    ),
    (
        'Terraza con parrilla',
        'Terraza equipada para reuniones familiares.',
        20, 1, 15, 4, '09:00', '21:00',
        30000, 60000, 15000
    ),
    (
        'Gimnasio',
        'Espacio para actividades físicas de los residentes.',
        15, 1, 7, 2, '07:00', '20:00',
        20000, 40000, 10000
    );

DO $$
BEGIN
    IF EXISTS (
        SELECT ec.id_edificio, lower(btrim(ec.nombre))
        FROM espacios_comunes ec
        JOIN edificios e ON e.id_edificio = ec.id_edificio
        JOIN seed_espacios d
          ON lower(btrim(d.nombre)) = lower(btrim(ec.nombre))
        WHERE lower(btrim(e.nombre)) IN ('torre norte', 'torre sur')
        GROUP BY ec.id_edificio, lower(btrim(ec.nombre))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay espacios comunes de demostración duplicados.';
    END IF;
END;
$$;

INSERT INTO espacios_comunes (
    nombre, descripcion, capacidad, activo, id_edificio
)
SELECT
    d.nombre,
    d.descripcion,
    d.capacidad,
    TRUE,
    e.id_edificio
FROM seed_espacios d
CROSS JOIN edificios e
WHERE lower(btrim(e.nombre)) IN ('torre norte', 'torre sur')
  AND NOT EXISTS (
      SELECT 1
      FROM espacios_comunes ec
      WHERE ec.id_edificio = e.id_edificio
        AND lower(btrim(ec.nombre)) = lower(btrim(d.nombre))
  );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM espacios_comunes ec
        JOIN edificios e ON e.id_edificio = ec.id_edificio
        JOIN seed_espacios d
          ON lower(btrim(d.nombre)) = lower(btrim(ec.nombre))
        WHERE lower(btrim(e.nombre)) IN ('torre norte', 'torre sur')
          AND ec.activo
          AND ec.capacidad < 1
    ) THEN
        RAISE EXCEPTION
            'Un espacio común activo tiene capacidad menor que uno.';
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
    d.dias_min,
    d.dias_max,
    d.duracion,
    d.apertura,
    d.cierre,
    d.costo,
    LEAST(d.capacidad, ec.capacidad),
    d.deposito,
    d.penalizacion,
    ec.id_espacio_comun,
    te.id_tipo_evento
FROM seed_espacios d
JOIN espacios_comunes ec
    ON lower(btrim(ec.nombre)) = lower(btrim(d.nombre))
JOIN edificios e
    ON e.id_edificio = ec.id_edificio
CROSS JOIN tipos_evento te
WHERE lower(btrim(e.nombre)) IN ('torre norte', 'torre sur')
  AND ec.activo
  AND te.activo
  AND EXISTS (
      SELECT 1
      FROM seed_catalogos sc
      WHERE sc.tabla = 'tipos_evento'
        AND lower(btrim(sc.nombre)) = lower(btrim(te.nombre))
  )
  AND NOT EXISTS (
      SELECT 1
      FROM politicas_reserva p
      WHERE p.id_espacio_comun = ec.id_espacio_comun
        AND p.id_tipo_evento = te.id_tipo_evento
  );

-- ============================================================
-- 7. INSUMOS: MIGRACIONES 009 Y 010
--
-- categoria almacena el nombre del catálogo, no un ID.
-- stock y stock_minimo admiten cantidades decimales.
-- Stock inicial cero: las entradas se registran con responsable
-- desde la aplicación, generando movimientos_insumo.
-- ============================================================

CREATE TEMP TABLE seed_insumos (
    nombre TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    categoria TEXT NOT NULL,
    unidad_medida TEXT NOT NULL,
    costo_unitario NUMERIC NOT NULL,
    stock_minimo NUMERIC NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_insumos
VALUES
    ('Cinta de teflón',
     'Rollo para sellado de conexiones roscadas.',
     'PLOMERIA', 'rollo', 5000, 10),

    ('Tubo PVC 1/2 pulgada',
     'Tubo para reparación de instalaciones de agua.',
     'PLOMERIA', 'metro', 8000, 10),

    ('Codo PVC 1/2 pulgada',
     'Accesorio para conexión de tuberías.',
     'PLOMERIA', 'unidad', 3000, 10),

    ('Llave de paso 1/2 pulgada',
     'Válvula de corte para instalaciones de agua.',
     'PLOMERIA', 'unidad', 25000, 3),

    ('Adhesivo para PVC',
     'Envase de adhesivo para uniones de PVC.',
     'PLOMERIA', 'envase', 18000, 3),

    ('Lámpara LED 12 W',
     'Lámpara para iluminación de áreas comunes.',
     'ELECTRICIDAD', 'unidad', 15000, 10),

    ('Cinta aisladora',
     'Rollo de cinta para aislamiento eléctrico.',
     'ELECTRICIDAD', 'rollo', 8000, 5),

    ('Cable eléctrico 2,5 mm²',
     'Conductor para reparación de instalaciones eléctricas.',
     'ELECTRICIDAD', 'metro', 6000, 20),

    ('Tomacorriente',
     'Tomacorriente de reposición.',
     'ELECTRICIDAD', 'unidad', 18000, 5),

    ('Interruptor de luz',
     'Interruptor simple de reposición.',
     'ELECTRICIDAD', 'unidad', 15000, 5),

    ('Detergente líquido',
     'Producto para limpieza general.',
     'LIMPIEZA', 'litro', 12000, 10),

    ('Lavandina',
     'Producto para limpieza y desinfección.',
     'LIMPIEZA', 'litro', 7000, 10),

    ('Desinfectante para pisos',
     'Producto para limpieza de pisos y superficies.',
     'LIMPIEZA', 'litro', 15000, 10),

    ('Bolsa para residuos 100 litros',
     'Bolsa de gran capacidad para áreas comunes.',
     'LIMPIEZA', 'unidad', 2500, 50),

    ('Paño de microfibra',
     'Paño reutilizable para limpieza.',
     'LIMPIEZA', 'unidad', 10000, 10),

    ('Fertilizante para jardín',
     'Fertilizante para mantenimiento de áreas verdes.',
     'JARDINERIA', 'kilogramo', 18000, 5),

    ('Tierra abonada',
     'Sustrato para mantenimiento de jardines.',
     'JARDINERIA', 'kilogramo', 3000, 20),

    ('Conector para manguera',
     'Accesorio para conexiones del sistema de riego.',
     'JARDINERIA', 'unidad', 12000, 4),

    ('Pintura látex blanca',
     'Pintura para mantenimiento de paredes interiores.',
     'PINTURA', 'litro', 35000, 10),

    ('Rodillo para pintura',
     'Rodillo para aplicación de pintura.',
     'PINTURA', 'unidad', 25000, 3),

    ('Lija para pared',
     'Hoja de lija para preparación de superficies.',
     'PINTURA', 'unidad', 4000, 10),

    ('Tornillo con tarugo 6 mm',
     'Conjunto para fijación en paredes.',
     'FERRETERIA', 'unidad', 1000, 50),

    ('Silicona selladora',
     'Cartucho de sellador para juntas.',
     'FERRETERIA', 'cartucho', 28000, 4),

    ('Lubricante multiuso',
     'Aerosol para mantenimiento de mecanismos.',
     'FERRETERIA', 'envase', 30000, 3),

    ('Conector RJ45',
     'Conector para cableado de red y cámaras.',
     'SEGURIDAD', 'unidad', 2500, 20),

    ('Cable UTP categoría 6',
     'Cable para mantenimiento de sistemas de cámaras.',
     'SEGURIDAD', 'metro', 5000, 30),

    ('Guantes de trabajo',
     'Guantes para tareas generales de mantenimiento.',
     'PROTECCION PERSONAL', 'par', 20000, 5),

    ('Gafas de protección',
     'Protección ocular para tareas de mantenimiento.',
     'PROTECCION PERSONAL', 'unidad', 25000, 3),

    ('Mascarilla para polvo',
     'Protección para tareas con presencia de polvo.',
     'PROTECCION PERSONAL', 'unidad', 8000, 10),

    ('Precinto plástico',
     'Elemento para sujeción y organización.',
     'GENERAL', 'unidad', 500, 100);

DO $$
BEGIN
    IF EXISTS (
        SELECT lower(btrim(i.nombre))
        FROM insumos i
        JOIN seed_insumos d
          ON lower(btrim(d.nombre)) = lower(btrim(i.nombre))
        GROUP BY lower(btrim(i.nombre))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay insumos de demostración con nombres duplicados.';
    END IF;
END;
$$;

INSERT INTO insumos (
    nombre,
    descripcion,
    categoria,
    unidad_medida,
    costo_unitario,
    stock,
    stock_minimo,
    activo
)
SELECT
    d.nombre,
    d.descripcion,
    c.nombre,
    d.unidad_medida,
    d.costo_unitario,
    0,
    d.stock_minimo,
    TRUE
FROM seed_insumos d
JOIN categorias_insumo c
    ON lower(btrim(c.nombre)) = lower(btrim(d.categoria))
WHERE c.activo
  AND NOT EXISTS (
      SELECT 1
      FROM insumos i
      WHERE lower(btrim(i.nombre)) = lower(btrim(d.nombre))
  );

-- ============================================================
-- 8. COMPROBAR ROLES OBLIGATORIOS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (
            VALUES
                ('ADMIN'),
                ('GESTOR'),
                ('RESIDENTE'),
                ('TECNICO')
        ) AS requerido(nombre)
        WHERE NOT EXISTS (
            SELECT 1
            FROM roles r
            WHERE r.nombre = requerido.nombre
        )
    ) THEN
        RAISE EXCEPTION
            'Falta uno de los roles obligatorios del sistema.';
    END IF;
END;
$$;

COMMIT;

-- Consulta de verificación.
SELECT id_rol, nombre, descripcion
FROM roles
WHERE nombre IN ('ADMIN', 'GESTOR', 'RESIDENTE', 'TECNICO')
ORDER BY nombre;