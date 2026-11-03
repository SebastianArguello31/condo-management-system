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

El administrador gestiona la información general. El técnico accede a las funciones autorizadas y sus indicadores operativos. El residente reporta y consulta sus incidencias y gestiona sus solicitudes de reserva; no accede al dashboard.

## Tecnologías y arquitectura

| Componente | Tecnología |
|---|---|
| Frontend | React y Vite |
| API REST | Python y Flask |
| Persistencia | PostgreSQL y consultas SQL mediante psycopg2 |
| Migraciones | Alembic y SQLAlchemy |
| Autenticación y validación | JWT, bcrypt y Marshmallow |
| Pruebas | unittest y pruebas de integración con PostgreSQL |

El sistema utiliza una arquitectura cliente-servidor con backend monolítico modular. Las rutas reciben las solicitudes, los servicios aplican las reglas de negocio y los repositorios acceden a la base de datos. SQLAlchemy se utiliza en las migraciones; la aplicación opera mediante psycopg2.

```text
React / Vite → API Flask (/condominio) → Servicios → Repositorios → PostgreSQL
```

## Requisitos

- Python 3.13, versión indicada por la guía del proyecto.
- Node.js 22.12 o superior y npm, compatibles con las dependencias del lockfile.
- PostgreSQL en ejecución; acceso mediante `psql` o pgAdmin.
- Git.

Los comandos siguientes utilizan **PowerShell** y parten de la raíz del repositorio, salvo cuando se indica otra carpeta.

## Instalación

### 1. Obtener el código y preparar Python

```powershell
git clone https://github.com/SebastianArguello31/condo-management-system.git
cd condo-management-system
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Si ya tienes el repositorio, comienza desde su carpeta. En cada nueva terminal que utilice Python, activa el entorno virtual.

### 2. Configurar el entorno

Copia el archivo de ejemplo si todavía no tienes `.env`:

```powershell
Copy-Item .env.example .env
```

Edita `.env` con tus credenciales y valores locales:

```dotenv
BACKEND_PORT=5000
FRONTEND_PORT=4000
SECRET_KEY=REEMPLAZAR_POR_UN_SECRETO
JWT_SECRET_KEY=REEMPLAZAR_POR_OTRO_SECRETO
JWT_ACCESS_TOKEN_HOURS=2
DB_HOST=localhost
DB_PORT=5432
DB_NAME=condominio
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD
```

Genera un valor diferente para cada secreto ejecutando dos veces:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

No incluyas `.env` ni credenciales reales en Git. Los puertos del backend y frontend deben ser diferentes.

### 3. Inicializar una base nueva

Crea en PostgreSQL una base vacía llamada `condominio`. Después ejecuta, adaptando usuario, host, puerto y base a tu `.env`:

```powershell
psql -h localhost -p 5432 -U postgres -d condominio -v ON_ERROR_STOP=1 -f database/schema.sql
python -m alembic stamp baseline_001
python -m alembic upgrade head
psql -h localhost -p 5432 -U postgres -d condominio -v ON_ERROR_STOP=1 -f database/seed.sql
```

`schema.sql` contiene el esquema base y la primera revisión de Alembic no lo crea. Por eso se carga primero el esquema, se registra la revisión base y luego se aplican las migraciones. La carga de datos iniciales requiere las migraciones completas y no crea usuarios ni contraseñas.

Si usas pgAdmin, ejecuta los archivos SQL desde su editor respetando el mismo orden y ejecuta los comandos de Alembic desde PowerShell.

**Base existente administrada por Alembic:** aplica únicamente `python -m alembic upgrade head`. No repitas la inicialización ni utilices `stamp head` para actualizarla, porque ese comando omite ejecutar las migraciones.

### 4. Crear el administrador

Desde la raíz, con la base preparada:

```powershell
python backend/scripts/create_admin.py
```

Completa los datos solicitados e inicia sesión con esa cuenta. No existe registro público de usuarios. Para que un residente reporte incidencias vinculadas a una unidad, debe tener la asociación correspondiente registrada.

## Ejecución local

En una terminal, desde la raíz y con el entorno virtual activado:

```powershell
python backend/run.py
```

En otra terminal, desde la raíz:

```powershell
cd frontend
npm ci
npm run dev
```

- **Aplicación:** http://127.0.0.1:4000
- **Estado de la API:** http://127.0.0.1:5000/
- **Prefijo de la API:** `/condominio`

Estos son los puertos predeterminados; si los cambias en `.env`, utiliza los valores configurados. Vite reenvía las solicitudes `/condominio` al backend durante el desarrollo. Mantén ambas terminales abiertas.

Para generar la compilación del frontend, ejecuta `npm run build` desde `frontend`. El resultado se guarda en `frontend/dist`; su despliegue requiere configurar por separado el servicio de la API y el enrutamiento de `/condominio`.

## Migraciones

Los cambios se encuentran en `database/migrations/versions/`. Incluyen especialidades, recuperación de contraseña, asignaciones, políticas de reserva, comentarios del historial, correo normalizado e inventario de insumos.

```powershell
python -m alembic current
python -m alembic upgrade head
python -m alembic history
```

La revisión de inventario es `s4_009_inventario_insumos`. Para nuevas modificaciones se crea otra migración; no se editan revisiones ya aplicadas. Las migraciones se escriben manualmente, sin `--autogenerate`.

## Pruebas

Desde la raíz, con las dependencias instaladas y el entorno virtual activado:

```powershell
$env:RUN_DB_TESTS = "0"
python -B -m unittest discover -s backend/tests -t backend -p "test_*.py" -v
```

Este comando ejecuta las pruebas que no requieren PostgreSQL y omite las de integración con base de datos. Una prueba omitida no cuenta como aprobada.

Para ejecutar integración, crea una base exclusiva, diferente de la habitual y cuyo nombre termine en `_test`, por ejemplo `condo_management_test`. Configura `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_NAME`, `TEST_DB_USER` y `TEST_DB_PASSWORD` siguiendo la [guía de pruebas](docs/TESTING.md). El usuario de pruebas debe poder crear esquemas en esa base.

```powershell
$env:RUN_DB_TESTS = "1"
python -B -m unittest discover -s backend/tests/integration -t backend -p "test_*.py" -v
```

La suite prepara el esquema, aplica migraciones, carga datos y elimina sus esquemas temporales al finalizar. No requiere iniciar el frontend ni el servidor backend. Incluye escenarios de incidencias, reservas, usuarios, adjuntos, transacciones y dashboard integrado con consumo y devolución de insumos.

## Estructura

```text
backend/
  app/core/             Configuración, seguridad, validación y acceso a datos
  app/modules/          Módulos funcionales de la API
  scripts/              Creación del administrador
  tests/                Pruebas e integración
  run.py                Inicio del backend
frontend/
  src/features/         Pantallas organizadas por funcionalidad
  src/components/       Componentes compartidos
  src/services/         Comunicación con la API
database/
  schema.sql            Esquema base
  seed.sql              Datos iniciales y de demostración
  migrations/           Evolución del esquema con Alembic
docs/                   Documentación del proyecto
```

## Documentación y seguimiento

- [Documento funcional](docs/documento-funcional.md).
- [Estructura del proyecto](docs/estructura-proyecto.md).
- [Permisos de incidencias](docs/incidencias-permisos.md).
- [Indicadores del dashboard](docs/indicadores-analytics.md).
- [Guía de pruebas](docs/TESTING.md).
- [Repositorio Git](https://github.com/SebastianArguello31/condo-management-system).
- [Proyecto Jira](https://grupo6-condominios-is2.atlassian.net/jira/software/projects/ED/summary).