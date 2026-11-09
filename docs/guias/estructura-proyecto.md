# Arquitectura y estructura del proyecto

El sistema tiene una arquitectura cliente-servidor con un backend monolítico modular. React consume una API REST de Flask bajo `/condominio`. Los repositorios ejecutan SQL mediante psycopg2; Alembic utiliza SQLAlchemy para las migraciones, sin modelos ORM en la aplicación.

## Componentes

| Componente | Responsabilidad |
|---|---|
| React y Vite | Pantallas, rutas por hash y comunicación HTTP. |
| Flask | Autenticación JWT, permisos, validación y reglas de negocio. |
| PostgreSQL | Persistencia de datos e historial. |
| Redis | Límites de solicitudes y cola RQ de recuperación. |
| Worker RQ y SMTP | Procesamiento y envío de correos de recuperación. |
| Almacenamiento local | Adjuntos; sus metadatos se guardan en PostgreSQL. |

## Organización

```text
backend/
  app/
    __init__.py             Fábrica Flask, rutas y errores
    core/                   Configuración, datos, seguridad y correo
    modules/
      auth/                 Sesiones y recuperación
      users/                Cuentas, residentes, personal y especialidades
      units/                Edificios y unidades
      incidents/            Incidencias, adjuntos y seguimiento
      common_spaces/        Espacios, políticas y disponibilidad
      reservations/         Solicitudes y gestión de reservas
      maintenance/          Intervenciones e inventario
      analytics/            Indicadores y registros del dashboard
  instance/uploads/incidents/  Adjuntos generados en ejecución
  scripts/
    create_admin.py
    worker_password_reset.py
  tests/                    Pruebas aisladas
  run.py
frontend/
  src/
    components/ui/          Kit compartido
    config/routing.js       Rutas, roles y navegación
    features/               Pantallas por funcionalidad
    hooks/                  Hooks compartidos
    services/               Cliente y rutas de API
    styles/                 Tokens y estilos base
    utils/                  Utilidades
    validations/            Reglas y esquemas
    dev/                    Guía visual del kit
  tests/                    Pruebas JavaScript
  vite.config.js
  package.json
database/
  schema.sql                Esquema base
  seed.sql                  Catálogos y datos de demostración
  migrations/               Evolución del esquema
docs/                       Guías técnicas y funcionales
```

`features` incluye `auth`, `users`, `units`, `incidents`, `maintenance`, `reservas`, `espacios-comunes` y `dashboard`.

## Flujo de una solicitud

```text
React → Cliente HTTP → Ruta Flask → Servicio → Repositorio → PostgreSQL
```

Las rutas verifican autenticación y permisos, validan entradas con Marshmallow y serializan respuestas. Los servicios coordinan reglas y transacciones; los repositorios contienen SQL. Los módulos pequeños usan archivos como `routes.py`, `schemas.py` y `services.py`; otros, como `users`, los distribuyen en paquetes. Incidencias y reservas separan reglas puras en `rules.py`.

Las solicitudes habituales usan JSON. La creación de incidencias con adjuntos utiliza `multipart/form-data`. Las descargas verifican autenticación y permisos.

## Desarrollo y despliegue

Los puertos predeterminados son 5000 para Flask y 4000 para Vite, configurables desde `.env`. Vite reenvía `/condominio` al backend durante el desarrollo. `npm run preview` sirve la compilación sin ese proxy configurado.

El despliegue debe resolver el servicio de la API, el enrutamiento de `/condominio`, los servicios auxiliares y la persistencia de adjuntos. Consulta la [guía de ejecución](guia-ejecucion.md) y la [guía de pruebas](../TESTING.md).
