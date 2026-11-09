# Sistema de Gestión de Condominios

Aplicación web para gestionar incidencias, mantenimiento y reservas de espacios comunes. Integra el seguimiento de intervenciones, el inventario de insumos y un dashboard de indicadores.

Proyecto de **Ingeniería de Software 2 — Facultad Politécnica, Universidad Nacional de Asunción**.

**Grupo 6:** Sebastian Arguello, Lucas Boicetta, Fernando Ibarra y Kevin Valiente.

## Funcionalidades

- **Usuarios y unidades:** administración de cuentas, residentes, técnicos, especialidades, edificios y unidades; permisos por rol.
- **Incidencias:** registro con adjuntos, asignación de técnicos, cambios de estado, intervenciones e historial.
- **Reservas:** gestión de espacios comunes y políticas; disponibilidad, solicitudes, aprobación, rechazo y cancelación.
- **Insumos:** registro y edición de materiales, existencias iniciales, entradas, salidas, ajustes, historial y alertas de stock bajo. Consumo asociado a intervenciones y soporte de devoluciones en la API.
- **Dashboard:** indicadores de incidencias, resolución, cumplimiento de plazos, intervenciones y consumo de insumos; filtros y consulta de registros asociados.

El administrador gestiona la información general. El gestor coordina asignaciones y prioridades. Ambos acceden al dashboard. El técnico atiende sus incidencias asignadas; el residente reporta incidencias y gestiona sus solicitudes de reserva. Consulta los [permisos de incidencias](docs/guias/documento-funcional.md#8-permisos-de-incidencias).

## Tecnologías y arquitectura

| Componente | Tecnología |
|---|---|
| Frontend | React y Vite |
| API REST | Python y Flask |
| Persistencia | PostgreSQL y consultas SQL mediante psycopg2 |
| Migraciones | Alembic y SQLAlchemy |
| Autenticación y validación | JWT, bcrypt y Marshmallow |
| Límites de solicitudes y cola de trabajos | Redis |
| Recuperación de contraseña | Worker RQ y correo SMTP con STARTTLS |
| Pruebas | unittest con mocks  |

El sistema utiliza una arquitectura cliente-servidor con backend monolítico modular. Las rutas reciben las solicitudes, los servicios aplican las reglas de negocio y los repositorios acceden a la base de datos. SQLAlchemy se utiliza en las migraciones; la aplicación opera mediante psycopg2.

```text
React / Vite → API Flask (/condominio) → Servicios → Repositorios → PostgreSQL
                    ↓
               Redis (cola password-reset) → Worker RQ → SMTP → Correo
```

## Empezar

La [guía de ejecución](docs/guias/guia-ejecucion.md) reúne los requisitos y los pasos para instalar dependencias, configurar el entorno, inicializar PostgreSQL y crear el administrador. Incluye la plantilla completa de [`.env.example`](.env.example), Redis, SMTP y el worker de recuperación.

### Requisitos para ejecutar el sistema

- Python 3.13, Node.js 22.12 o superior y npm.
- PostgreSQL con el esquema y las migraciones aplicadas.
- Redis disponible en la dirección indicada por `REDIS_URL`: se utiliza tanto para los límites de solicitudes como para la cola de recuperación.
- Para recuperar contraseñas: servidor SMTP con STARTTLS y un worker RQ ejecutándose por separado.

Instalar las dependencias de Python instala los clientes de Redis y RQ, **no inicia el servidor Redis ni el worker**. La primera instalación, la creación de `.env` y la preparación de PostgreSQL están detalladas en la [guía de ejecución](docs/guias/guia-ejecucion.md).

### Configurar el archivo `.env`

El archivo `.env` se guarda en la **raíz de `condo-management-system`**, junto a `README.md`, `requirements.txt` y `.env.example`; no dentro de `backend` o `frontend`. Desde esa carpeta, crea tu copia sin sobrescribir una configuración existente:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edita `.env` y sustituye los valores de ejemplo. Esta es la plantilla completa:

```dotenv
# Servidores
BACKEND_PORT=5000
FRONTEND_PORT=4000

# Seguridad
SECRET_KEY=REEMPLAZAR_POR_UN_SECRETO
JWT_SECRET_KEY=REEMPLAZAR_POR_OTRO_SECRETO
JWT_ACCESS_TOKEN_HOURS=2

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=condominio
DB_USER=postgres
DB_PASSWORD=REEMPLAZAR

# Redis: límites de solicitudes y cola de recuperación
REDIS_URL=redis://localhost:6379/0

# Enlace público del frontend; ajusta el puerto si cambias FRONTEND_PORT
PASSWORD_RESET_URL=http://127.0.0.1:4000/#/restablecer-password

# Correo de recuperación: completa los valores con tu proveedor SMTP (STARTTLS)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=tu-correo@example.com
SMTP_PASSWORD=tu-contraseña
SMTP_FROM=tu-correo@example.com
SMTP_TIMEOUT=10
```

#### Servidores

| Variable | Explicación |
|---|---|
| `BACKEND_PORT` | Puerto en el que `python backend/run.py` inicia Flask. Por defecto `5000`. Vite también lo lee para reenviar las solicitudes `/condominio` al backend. |
| `FRONTEND_PORT` | Puerto del servidor Vite. Por defecto `4000`. Es el puerto que abres en el navegador. Debe ser distinto del puerto del backend. |

Usa puertos libres y enteros entre 1 y 65535. Si cambias `BACKEND_PORT`, reinicia Flask y Vite. Si cambias `FRONTEND_PORT`, reinicia Vite y actualiza el puerto de `PASSWORD_RESET_URL` para que los correos apunten a la aplicación correcta.

#### Seguridad y sesión

| Variable | Explicación |
|---|---|
| `SECRET_KEY` | Clave general de configuración de Flask. No tiene valor predeterminado; configura una cadena aleatoria propia. No sustituye a la clave JWT. |
| `JWT_SECRET_KEY` | Clave utilizada para firmar y verificar los tokens de autenticación. Es obligatoria: el backend no inicia si falta. Cambiarla invalida los tokens firmados con la clave anterior. |
| `JWT_ACCESS_TOKEN_HOURS` | Duración en horas de los nuevos tokens de acceso. Por defecto `2`; configura un entero positivo. |

Genera dos secretos diferentes ejecutando este comando dos veces, con el entorno virtual activo, y copia cada resultado en la variable correspondiente:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Estos secretos son valores internos de la aplicación, no contraseñas de usuarios ni credenciales de PostgreSQL. Reinicia el backend y el worker después de cambiarlos.

#### Conexión a PostgreSQL

| Variable | Explicación |
|---|---|
| `DB_HOST` | Dirección del servidor PostgreSQL. Por defecto `localhost` para una instalación en el mismo equipo. |
| `DB_PORT` | Puerto de PostgreSQL. Por defecto `5432`; usa el puerto real de tu instalación. |
| `DB_NAME` | Nombre de la base de datos existente. El ejemplo usa `condominio`; no tiene valor predeterminado en el backend. |
| `DB_USER` | Usuario de PostgreSQL con permisos sobre la base. El ejemplo usa `postgres`; no es el usuario con el que ingresas a la aplicación. |
| `DB_PASSWORD` | Contraseña de ese usuario de PostgreSQL. Sustituye `REEMPLAZAR` por la contraseña de tu instalación. |

Completar estas variables **no crea la base, sus tablas ni los usuarios de la aplicación**. Inicializa la base y aplica las migraciones siguiendo la [guía de ejecución](docs/guias/guia-ejecucion.md). El backend y el worker necesitan acceder a la misma base; reinicia ambos al cambiar estas variables.

#### Redis

| Variable | Explicación |
|---|---|
| `REDIS_URL` | Conexión usada por los límites de solicitudes y por la cola RQ `password-reset`. Por defecto `redis://localhost:6379/0`: `localhost` es el servidor, `6379` el puerto y `/0` el número de base lógica de Redis. |

Redis es un servicio separado de PostgreSQL. Configurar la URL no lo inicia. Flask y el worker deben utilizar la misma dirección para que los trabajos encolados puedan procesarse. Reinicia ambos si cambia la URL; más abajo se explica cómo iniciar y comprobar Redis.

#### Enlace de recuperación y correo SMTP

| Variable | Explicación |
|---|---|
| `PASSWORD_RESET_URL` | Dirección del frontend que recibirá el enlace de recuperación. Debe terminar en `#/restablecer-password`, sin credenciales ni parámetros de consulta previos. El ejemplo usa `http://127.0.0.1:4000/#/restablecer-password`; si se omite, el backend usa `http://localhost:4000/#/restablecer-password`. Fuera de `localhost` o `127.0.0.1` se exige HTTPS. |
| `SMTP_HOST` | Servidor de correo saliente de tu proveedor. No tiene un servidor utilizable por defecto; `smtp.example.com` es solo un ejemplo. Es obligatorio para enviar correos. |
| `SMTP_PORT` | Puerto SMTP con STARTTLS; por defecto `587`. La implementación usa STARTTLS, no una conexión SSL implícita. |
| `SMTP_USERNAME` | Usuario con el que se autentica el envío, normalmente una dirección de correo. Por defecto vacío. |
| `SMTP_PASSWORD` | Credencial SMTP correspondiente al usuario; utiliza la credencial que indique tu proveedor. Por defecto vacía. |
| `SMTP_FROM` | Dirección remitente del correo. Es obligatoria para el envío y debe estar autorizada por tu proveedor. Por defecto vacía. |
| `SMTP_TIMEOUT` | Tiempo de espera de las operaciones SMTP, en segundos. Por defecto `10`; configura un entero positivo. |

Completa `SMTP_USERNAME` y `SMTP_PASSWORD` juntos si el servidor requiere autenticación; si no la requiere, deja ambos vacíos. Reinicia backend y worker después de cambiar la configuración. El worker debe permanecer activo para enviar los correos; más abajo se describe el flujo de recuperación.

#### Cómo se aplica la configuración

- Los procesos Python cargan el `.env` de la raíz mediante `python-dotenv`. Una variable ya definida en el entorno del proceso tiene prioridad sobre el archivo.
- Vite lee los puertos del mismo archivo. Cambiar `.env` requiere reiniciar los procesos afectados; editarlo no reconfigura los procesos que ya están ejecutándose.
- Los valores predeterminados se aplican cuando una variable no está definida. Dejar una variable numérica como `SMTP_PORT=` o `JWT_ACCESS_TOKEN_HOURS=` no selecciona el valor predeterminado y provoca un error de configuración.
- `.env.example` contiene la plantilla que se comparte en Git. Guarda los secretos y las credenciales reales únicamente en tu `.env` local, sin subirlo al repositorio.
- `BACKEND_DEBUG`, `DB_POOL_MIN`, `DB_POOL_MAX` y `DB_CONNECT_TIMEOUT` no se leen en la implementación actual. Agregarlos a `.env` no cambia el comportamiento de la aplicación.

### Iniciar Redis

Si ya tienes Redis instalado, inicia su servicio. Si utilizas Docker, puedes crear una instancia local con este comando (requiere Docker en ejecución):

```powershell
# Solo la primera vez; el puerto queda accesible desde el equipo local.
docker run -d --name condominio-redis -p 127.0.0.1:6379:6379 redis:7-alpine
```

En los siguientes arranques, reutiliza el contenedor:

```powershell
docker start condominio-redis
docker exec condominio-redis redis-cli ping
```

La respuesta esperada es `PONG`. Estos comandos corresponden a `REDIS_URL=redis://localhost:6379/0`; si utilizas otra instancia, configura su dirección en `.env`. No necesitas crear otro contenedor si ya tienes Redis en ese puerto.

### Iniciar backend, frontend y worker

Con PostgreSQL y Redis disponibles y las dependencias instaladas, ejecuta lo siguiente **desde la raíz del repositorio**, en terminales separadas:

```powershell
# Terminal 1: backend
.\.venv\Scripts\Activate.ps1
python backend/run.py
```

```powershell
# Terminal 2: frontend
npm --prefix frontend run dev
```

```powershell
# Terminal 3: worker de recuperación de contraseña
.\.venv\Scripts\Activate.ps1
python backend/scripts/worker_password_reset.py
```

Mantén los tres procesos abiertos. El worker debe mostrar `Worker iniciado. Esperando solicitudes de recuperación.` y escuchar la cola `password-reset`. El script incluido selecciona la implementación compatible con Windows; utiliza este comando para iniciarlo.

Abre [la aplicación](http://127.0.0.1:4000). La [raíz de la API](http://127.0.0.1:5000/) confirma que Flask responde; no comprueba los servicios externos. Los puertos se configuran en `.env`.

## Recuperación de contraseña

Configura `REDIS_URL`, `PASSWORD_RESET_URL` y las variables `SMTP_*` como se explica en la sección de configuración de `.env`. Para ejecutar el circuito completo deben estar disponibles PostgreSQL, Redis, Flask, el frontend y el worker de recuperación.

### Flujo y comprobación

1. El usuario solicita recuperar su contraseña desde la pantalla de acceso.
2. Flask encola el trabajo en Redis y devuelve una respuesta genérica para no revelar si la cuenta existe.
3. El worker consume el trabajo, consulta PostgreSQL y, para una cuenta activa, genera el enlace y lo envía por SMTP.
4. El usuario abre el enlace y establece una contraseña nueva. El enlace vence a los 30 minutos y permite un solo uso.

**La respuesta de la pantalla no confirma que el correo se haya enviado.** Sin el worker, la solicitud puede quedar encolada sin procesar. Los trabajos pendientes caducan a los cinco minutos; si iniciaste el worker después de ese plazo, solicita otro enlace.

Para comprobar el circuito completo, utiliza una cuenta activa cuyo correo puedas consultar, solicita la recuperación y observa la terminal del worker. Revisa también la carpeta de spam, abre el enlace recibido y comprueba el acceso con la contraseña nueva.

### Si no llega el correo

| Síntoma | Qué revisar |
|---|---|
| Error de conexión a Redis | Servicio o contenedor iniciado y `REDIS_URL` correcta en `.env`. Redis también se utiliza para limitar solicitudes de autenticación. |
| La pantalla acepta la solicitud, pero no se procesa | Worker activo, misma instancia Redis que Flask y cola `password-reset`. Si pasó más de cinco minutos, solicita otro enlace. |
| El worker muestra un error SMTP | Host, puerto STARTTLS, credenciales y remitente autorizado. Consulta el error en la terminal del worker. |
| El worker muestra un error de base de datos | PostgreSQL disponible, variables `DB_*` correctas y migraciones aplicadas. |
| El trabajo termina sin correo | La cuenta debe existir y estar activa; revisa además spam y el estado de entrega del proveedor. |
| El enlace abre una dirección incorrecta | Corrige `PASSWORD_RESET_URL`, reinicia backend y worker y solicita otro enlace. |
| El enlace expiró o ya fue utilizado | Solicita uno nuevo; su vigencia es de 30 minutos y tiene un único uso. |

## Pruebas

Con las dependencias instaladas y el entorno virtual activo:

```powershell
python -B -m unittest discover -s backend/tests -t backend -p "test_*.py" -v
npm --prefix frontend run build
```

Las pruebas del backend son aisladas y no requieren PostgreSQL, Redis ni SMTP. El comando del frontend comprueba la compilación; actualmente no hay un script `npm test`. Estas verificaciones no sustituyen la prueba real del envío de correo con los servicios activos. Consulta la [guía de pruebas](docs/TESTING.md).

## Documentación

- [Índice de guías](docs/README.md): encuentra cada tema y las referencias del equipo.
- [Configuración y ejecución](docs/guias/guia-ejecucion.md): instalación, `.env`, servicios, migraciones y diagnóstico.
- [Documento funcional](docs/guias/documento-funcional.md): alcance, roles, permisos y limitaciones.
- [Arquitectura](docs/guias/estructura-proyecto.md): organización y flujo del código.
- [Indicadores](docs/guias/indicadores-analytics.md): cálculos y contratos del dashboard.

## Equipo y seguimiento

- [Repositorio Git](https://github.com/SebastianArguello31/condo-management-system).
- [Proyecto Jira](https://grupo6-condominios-is2.atlassian.net/jira/software/projects/ED/summary).
