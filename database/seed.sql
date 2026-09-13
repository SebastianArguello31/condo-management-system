BEGIN;

-- Evita inserciones simultáneas mientras se cargan los catálogos.
-- La mayoría de estas tablas no tiene UNIQUE sobre nombre.
LOCK TABLE
    roles,
    tipo_edificio,
    tipo_unidad,
    tipos_incidencia,
    estados_incidencia,
    prioridades,
    cargos_personal,
    tipos_evento,
    estado_reservas
IN SHARE ROW EXCLUSIVE MODE;

-- ============================================================
-- 1. ROLES
-- Nombres utilizados por los decoradores del backend.
-- ============================================================

INSERT INTO roles (nombre, descripcion)
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
ON CONFLICT (nombre) DO NOTHING;


-- ============================================================
-- 2. TIPOS DE EDIFICIO
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
    WHERE existente.nombre = datos.nombre
);


-- ============================================================
-- 3. TIPOS DE UNIDAD
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
    WHERE existente.nombre = datos.nombre
);


-- ============================================================
-- 4. TIPOS DE INCIDENCIA
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
    WHERE existente.nombre = datos.nombre
);


-- ============================================================
-- 5. ESTADOS DE INCIDENCIA
-- RECIBIDA es utilizado al crear una solicitud.
-- Los demás quedan disponibles para implementar su seguimiento.
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
            'La administración confirmó el cierre de la solicitud.'
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
-- 6. PRIORIDADES
-- Convención propuesta: mayor nivel = mayor urgencia.
-- Normal es utilizada por el servicio de creación de incidencias.
-- Los tiempos son objetivos iniciales, expresados en horas.
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
    datos.tiempo_resolucion_horas,
    TRUE
FROM (
    VALUES
        ('Baja',    1, 168),
        ('Normal',  2,  72),
        ('Alta',    3,  24),
        ('Urgente', 4,   4)
) AS datos(nombre, nivel, tiempo_resolucion_horas)
WHERE NOT EXISTS (
    SELECT 1
    FROM prioridades existente
    WHERE existente.nombre = datos.nombre
);


-- ============================================================
-- 7. CARGOS DEL PERSONAL
-- Se asocian a los usuarios mediante usuario_cargos.
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
    WHERE existente.nombre = datos.nombre
);


-- ============================================================
-- 8. TIPOS DE EVENTO
-- Disponibles para el futuro módulo de reservas.
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
    WHERE existente.nombre = datos.nombre
);


-- ============================================================
-- 9. ESTADOS DE RESERVA
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
            'Reserva aprobada y confirmada.'
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

COMMIT;


-- ============================================================
-- 10. COMPROBACIÓN
-- Muestra la cantidad total de registros de cada catálogo.
-- ============================================================

SELECT 'roles' AS catalogo, COUNT(*) AS cantidad FROM roles
UNION ALL
SELECT 'tipo_edificio', COUNT(*) FROM tipo_edificio
UNION ALL
SELECT 'tipo_unidad', COUNT(*) FROM tipo_unidad
UNION ALL
SELECT 'tipos_incidencia', COUNT(*) FROM tipos_incidencia
UNION ALL
SELECT 'estados_incidencia', COUNT(*) FROM estados_incidencia
UNION ALL
SELECT 'prioridades', COUNT(*) FROM prioridades
UNION ALL
SELECT 'cargos_personal', COUNT(*) FROM cargos_personal
UNION ALL
SELECT 'tipos_evento', COUNT(*) FROM tipos_evento
UNION ALL
SELECT 'estado_reservas', COUNT(*) FROM estado_reservas
ORDER BY catalogo;