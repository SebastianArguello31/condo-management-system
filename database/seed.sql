-- Reejecutable: no borra datos, no cambia identificadores ni reactiva catálogos.
-- No crea cuentas ni contraseñas conocidas.

BEGIN;

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

INSERT INTO roles (nombre, descripcion)
VALUES
    ('ADMIN', 'Administra usuarios, edificios, unidades y solicitudes.'),
    ('RESIDENTE', 'Reporta problemas y consulta sus propias solicitudes.'),
    ('TECNICO', 'Personal encargado de mantenimiento y servicios.')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tipo_edificio (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        ('Residencial', 'Edificio destinado principalmente a viviendas.'),
        ('Comercial', 'Edificio destinado principalmente a locales comerciales.'),
        ('Mixto', 'Edificio con viviendas y espacios comerciales.'),
        ('Administrativo', 'Edificio destinado a oficinas y administración.')
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM tipo_edificio existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

INSERT INTO tipo_unidad (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        ('Departamento', 'Unidad habitacional dentro de un edificio.'),
        ('Casa', 'Vivienda individual dentro del condominio.'),
        ('Local comercial', 'Unidad destinada a actividades comerciales.'),
        ('Oficina', 'Unidad destinada a actividades profesionales.'),
        ('Cochera', 'Unidad destinada al estacionamiento de vehículos.'),
        ('Depósito', 'Unidad destinada al almacenamiento.')
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM tipo_unidad existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

-- Edificios de demostración. Se buscan por nombre para que el seed sea
-- reejecutable y conserve los identificadores existentes.
INSERT INTO edificios (nombre, direccion, created_at, id_tipo_edificio)
SELECT datos.nombre, datos.direccion, CURRENT_TIMESTAMP, te.id_tipo_edificio
FROM (
    VALUES
        ('Torre Norte', 'Av. de la Integración 1200', 'Residencial'),
        ('Torre Sur', 'Av. de la Integración 1250', 'Residencial')
) AS datos(nombre, direccion, tipo_edificio)
JOIN tipo_edificio te
    ON lower(btrim(te.nombre)) = lower(btrim(datos.tipo_edificio))
WHERE NOT EXISTS (
    SELECT 1
    FROM edificios existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

-- Unidades vinculadas a cada edificio mediante su nombre y tipo de unidad.
INSERT INTO unidades (codigo, piso, created_at, id_edificio, id_tipo_unidad)
SELECT datos.codigo, datos.piso, CURRENT_TIMESTAMP, e.id_edificio, tu.id_tipo_unidad
FROM (
    VALUES
        ('101', '1', 'Torre Norte', 'Departamento'),
        ('102', '1', 'Torre Norte', 'Departamento'),
        ('201', '2', 'Torre Norte', 'Departamento'),
        ('202', '2', 'Torre Norte', 'Departamento'),
        ('301', '3', 'Torre Norte', 'Departamento'),
        ('302', '3', 'Torre Norte', 'Departamento'),
        ('101', '1', 'Torre Sur', 'Departamento'),
        ('102', '1', 'Torre Sur', 'Departamento'),
        ('201', '2', 'Torre Sur', 'Departamento'),
        ('202', '2', 'Torre Sur', 'Departamento'),
        ('301', '3', 'Torre Sur', 'Departamento'),
        ('302', '3', 'Torre Sur', 'Departamento')
) AS datos(codigo, piso, edificio, tipo_unidad)
JOIN edificios e
    ON lower(btrim(e.nombre)) = lower(btrim(datos.edificio))
JOIN tipo_unidad tu
    ON lower(btrim(tu.nombre)) = lower(btrim(datos.tipo_unidad))
WHERE NOT EXISTS (
    SELECT 1
    FROM unidades existente
    WHERE existente.codigo = datos.codigo
      AND existente.id_edificio = e.id_edificio
);

-- Espacios comunes vinculados a cada edificio.
INSERT INTO espacios_comunes (nombre, descripcion, capacidad, activo, id_edificio)
SELECT datos.nombre, datos.descripcion, datos.capacidad, TRUE, e.id_edificio
FROM (
    VALUES
        ('Salón de eventos', 'Espacio para reuniones y celebraciones de residentes.', 40, 'Torre Norte'),
        ('Terraza con parrilla', 'Terraza equipada para reuniones familiares.', 20, 'Torre Norte'),
        ('Gimnasio', 'Espacio para actividades físicas de los residentes.', 15, 'Torre Norte'),
        ('Salón de eventos', 'Espacio para reuniones y celebraciones de residentes.', 40, 'Torre Sur'),
        ('Terraza con parrilla', 'Terraza equipada para reuniones familiares.', 20, 'Torre Sur'),
        ('Gimnasio', 'Espacio para actividades físicas de los residentes.', 15, 'Torre Sur')
) AS datos(nombre, descripcion, capacidad, edificio)
JOIN edificios e
    ON lower(btrim(e.nombre)) = lower(btrim(datos.edificio))
WHERE NOT EXISTS (
    SELECT 1
    FROM espacios_comunes existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
      AND existente.id_edificio = e.id_edificio
);


INSERT INTO tipos_incidencia (nombre, descripcion, activo)
SELECT datos.nombre, datos.descripcion, TRUE
FROM (
    VALUES
        ('Agua', 'Pérdidas de agua, cañerías, grifería y suministro.'),
        ('Electricidad', 'Problemas en instalaciones eléctricas e iluminación.'),
        ('Desagüe', 'Obstrucciones, filtraciones y problemas de drenaje.'),
        ('Infraestructura', 'Daños en paredes, techos, pisos y otras estructuras.'),
        ('Ascensores', 'Fallas de funcionamiento en ascensores.'),
        ('Accesos', 'Problemas con puertas, portones, cerraduras e intercomunicadores.'),
        ('Limpieza', 'Necesidades de limpieza y retiro de residuos.'),
        ('Áreas verdes', 'Mantenimiento de jardines, árboles y sistemas de riego.'),
        ('Seguridad', 'Problemas en cámaras, alarmas y otros equipos de seguridad.'),
        ('Otros', 'Otros problemas de mantenimiento.')
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM tipos_incidencia existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

INSERT INTO estados_incidencia (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        ('RECIBIDA', 'Solicitud recibida y pendiente de revisión.'),
        ('EN_REVISION', 'La administración está evaluando la solicitud.'),
        ('ASIGNADA', 'La solicitud tiene personal responsable asignado.'),
        ('EN_PROCESO', 'Se están realizando trabajos para resolver el problema.'),
        ('EN_ESPERA', 'La atención está pendiente de información, materiales o acceso.'),
        ('RESUELTA', 'Los trabajos finalizaron y el problema fue resuelto.'),
        ('CERRADA', 'La administración confirmó el cierre de la solicitud.'),
        ('RECHAZADA', 'La solicitud fue evaluada y no corresponde atenderla.'),
        ('CANCELADA', 'La solicitud fue cancelada.')
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM estados_incidencia existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

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
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

INSERT INTO cargos_personal (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        ('Encargado de mantenimiento', 'Coordina y supervisa las tareas de mantenimiento.'),
        ('Plomero', 'Atiende instalaciones de agua, cañerías y desagües.'),
        ('Electricista', 'Atiende instalaciones y equipos eléctricos.'),
        ('Técnico de ascensores', 'Realiza mantenimiento especializado de ascensores.'),
        ('Personal de limpieza', 'Realiza limpieza y gestión de residuos.'),
        ('Jardinero', 'Realiza mantenimiento de jardines y áreas verdes.'),
        ('Personal de seguridad', 'Realiza vigilancia y control de accesos.'),
        ('Mantenimiento general', 'Realiza reparaciones y tareas generales de mantenimiento.')
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM cargos_personal existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

INSERT INTO tipos_evento (nombre, descripcion, activo)
SELECT datos.nombre, datos.descripcion, TRUE
FROM (
    VALUES
        ('Reunión familiar', 'Encuentro privado de familiares y allegados.'),
        ('Cumpleaños', 'Celebración de cumpleaños.'),
        ('Asamblea de residentes', 'Reunión de residentes para tratar asuntos del condominio.'),
        ('Actividad deportiva', 'Encuentro o actividad deportiva.'),
        ('Actividad recreativa', 'Actividad de entretenimiento o convivencia.'),
        ('Otro', 'Evento que no corresponde a las categorías anteriores.')
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM tipos_evento existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

-- Políticas de demostración: los seis tipos de evento del seed se habilitan
-- para cada espacio de Torre Norte y Torre Sur, con tarifas según el espacio.
-- Deben insertarse después de tipos_evento. No reemplazan políticas existentes.
INSERT INTO politicas_reserva (
    dias_anticipacion_min, dias_anticipacion_max, duracion_max_horas,
    hora_apertura, hora_cierre, costo, aforo_maximo,
    deposito_garantia, penalizaciones, id_espacio_comun, id_tipo_evento
)
SELECT
    datos.dias_anticipacion_min,
    datos.dias_anticipacion_max,
    datos.duracion_max_horas,
    datos.hora_apertura::TIME,
    datos.hora_cierre::TIME,
    datos.costo,
    LEAST(datos.aforo_maximo, ec.capacidad),
    datos.deposito_garantia,
    datos.penalizaciones,
    ec.id_espacio_comun,
    te.id_tipo_evento
FROM (
    VALUES
        ('Salón de eventos',    1, 30, 5, '08:00', '22:00', 50000, 40, 100000, 20000),
        ('Terraza con parrilla', 1, 15, 4, '09:00', '21:00', 30000, 20,  60000, 15000),
        ('Gimnasio',             1,  7, 2, '07:00', '20:00', 20000, 15,  40000, 10000)
) AS datos(
    espacio, dias_anticipacion_min, dias_anticipacion_max, duracion_max_horas,
    hora_apertura, hora_cierre, costo, aforo_maximo,
    deposito_garantia, penalizaciones
)
JOIN espacios_comunes ec
    ON lower(btrim(ec.nombre)) = lower(btrim(datos.espacio))
JOIN edificios e ON e.id_edificio = ec.id_edificio
CROSS JOIN tipos_evento te
WHERE lower(btrim(e.nombre)) IN ('torre norte', 'torre sur')
  AND ec.activo = TRUE
  AND te.activo = TRUE
  AND lower(btrim(te.nombre)) IN (
      'reunión familiar', 'cumpleaños', 'asamblea de residentes',
      'actividad deportiva', 'actividad recreativa', 'otro'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM politicas_reserva existente
      WHERE existente.id_espacio_comun = ec.id_espacio_comun
        AND existente.id_tipo_evento = te.id_tipo_evento
  );

INSERT INTO estado_reservas (nombre, descripcion)
SELECT datos.nombre, datos.descripcion
FROM (
    VALUES
        ('PENDIENTE', 'Reserva solicitada y pendiente de evaluación.'),
        ('CONFIRMADA', 'Reserva aprobada y confirmada.'),
        ('RECHAZADA', 'La solicitud de reserva no fue aprobada.'),
        ('CANCELADA', 'La reserva fue cancelada.'),
        ('FINALIZADA', 'El uso reservado del espacio finalizó.')
) AS datos(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM estado_reservas existente
    WHERE lower(btrim(existente.nombre)) = lower(btrim(datos.nombre))
);

INSERT INTO especialidades (nombre, descripcion, activo)
VALUES
    ('Plomería', 'Agua, cañerías y desagües.', TRUE),
    ('Electricidad', 'Instalaciones eléctricas e iluminación.', TRUE),
    ('Ascensores', 'Mantenimiento de ascensores.', TRUE),
    ('Limpieza', 'Limpieza y gestión de residuos.', TRUE),
    ('Jardinería', 'Mantenimiento de áreas verdes.', TRUE),
    ('Seguridad', 'Sistemas de seguridad y accesos.', TRUE),
    ('Mantenimiento general', 'Reparaciones generales.', TRUE)
ON CONFLICT DO NOTHING;

COMMIT;
