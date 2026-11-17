# Configuración y ejecución

Requisitos: Python 3.13, Node.js 22.12 o superior, npm, PostgreSQL, Redis y Git. Para recuperar contraseñas también se requieren SMTP con STARTTLS y el worker RQ.
Los comandos siguientes utilizan PowerShell y parten de la raíz del repositorio, salvo cuando se indica otra carpeta. En cada terminal que use Python, activa el entorno virtual.

## Instalación inicial

### 1. Preparar el entorno

Si todavía no tienes el código:

```powershell
git clone https://github.com/SebastianArguello31/condo-management-system.git
cd condo-management-system
```

Si ya lo tienes, entra en la carpeta del repositorio. Prepara el entorno:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Esta es la plantilla completa de configuración, igual que [`.env.example`](../../.env.example). Sustituye los ejemplos por tus valores locales:

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

Los valores de ejemplo no son credenciales utilizables. Para enviar correos, configura `SMTP_HOST` y `SMTP_FROM`, y completa `SMTP_USERNAME` y `SMTP_PASSWORD` juntos si el servidor requiere autenticación. Mantén coherentes `FRONTEND_PORT` y el puerto de `PASSWORD_RESET_URL`.

No incluyas `.env` ni credenciales reales en Git. Genera un valor diferente para cada secreto ejecutando dos veces:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Preparar una base nueva

Crea una base vacía llamada `condominio` en PostgreSQL.

Ejecuta los siguientes comandos, adaptando host, puerto, usuario y base a tu `.env`:

```powershell
psql -h localhost -p 5432 -U postgres -d condominio -v ON_ERROR_STOP=1 -f database/schema.sql
python -m alembic stamp baseline_001
python -m alembic upgrade head
psql -h localhost -p 5432 -U postgres -d condominio -v ON_ERROR_STOP=1 -f database/seed.sql
```

`schema.sql` contiene el esquema base; la primera revisión de Alembic no lo crea. Por eso primero se carga el esquema, se registra `baseline_001` y luego se aplican las migraciones. El seed requiere las migraciones completas: carga catálogos y datos de demostración, sin crear usuarios ni contraseñas.

Si no tienes `psql` en el PATH, ejecuta los archivos SQL desde pgAdmin respetando el mismo orden y los comandos de Alembic desde PowerShell.

Este procedimiento es para una base nueva. Una base ya inicializada
con Alembic se actualiza con `python -m alembic upgrade head`.

### 3. Crear el administrador

```powershell
python backend/scripts/create_admin.py
```

Completa los datos solicitados. No existe registro público de usuarios.

### 4. Ejecutar el backend

Desde la raíz, con el entorno virtual activado y Redis disponible:

```powershell
python backend/run.py
```

La API estará disponible en http://127.0.0.1:5000.

### 5. Ejecutar el frontend

En otra terminal, desde la raíz:

```powershell
cd frontend
npm ci
npm run dev
```

Abre http://127.0.0.1:4000 e ingresa con el administrador creado.

Mantén ambas terminales abiertas. Vite reenvía las solicitudes
`/condominio` al backend durante el desarrollo.

Para que un residente pueda reportar incidencias, su usuario debe
estar asociado a una unidad mediante la tabla `residentes`.

## Servicios y configuración

Flask y Vite leen `.env` desde la raíz. Reinicia los procesos después de cambiarlo.

| Variables | Uso |
|---|---|
| `BACKEND_PORT`, `FRONTEND_PORT` | Puertos distintos; por defecto 5000 y 4000. |
| `SECRET_KEY`, `JWT_SECRET_KEY` | Secretos de aplicación y firma JWT. Flask exige `JWT_SECRET_KEY`. |
| `JWT_ACCESS_TOKEN_HOURS` | Duración del token; por defecto 2 horas. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión PostgreSQL. |
| `REDIS_URL` | Límites y cola `password-reset`; por defecto `redis://localhost:6379/0`. |
| `PASSWORD_RESET_URL` | URL terminada en `#/restablecer-password`. Ajusta el puerto si lo cambias. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | Servidor, puerto y remitente; se utiliza STARTTLS. |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Configura ambas credenciales o deja ambas vacías. |
| `SMTP_TIMEOUT` | Espera SMTP en segundos; por defecto 10. |

La plantilla omite `BACKEND_DEBUG`, `DB_POOL_MIN`, `DB_POOL_MAX` y `DB_CONNECT_TIMEOUT` porque el código actual no los aplica. Si permanecen en un `.env` anterior, no tienen efecto: `DEBUG` está fijado en `False`, no hay pool y la conexión usa un timeout de 5 segundos.

### Recuperación de contraseña

Configura Redis y SMTP. La URL debe usar HTTPS fuera de `localhost` o `127.0.0.1`, no incluir credenciales ni query previa y terminar en `#/restablecer-password`.

En otra terminal, desde la raíz y con el entorno virtual activo:

```powershell
python backend/scripts/worker_password_reset.py
```

Mantén el worker abierto. El script selecciona una implementación compatible con Windows. Un envío encolado no garantiza la entrega: revisa también la salida del worker.

### Compilación

```powershell
npm --prefix frontend run build
```

El resultado queda en `frontend/dist`. `npm --prefix frontend run preview` permite inspeccionarlo, pero no configura el proxy de API utilizado por `npm run dev`.

## Solución de problemas

| Síntoma | Comprobación |
|---|---|
| Falta `JWT_SECRET_KEY` | Completa `.env` en la raíz y reinicia Flask. |
| Error PostgreSQL | Verifica servicio, base y valores `DB_*`. |
| Faltan tablas o columnas | Comprueba `alembic current` y aplica `upgrade head` después del esquema base. |
| Error de Redis | Verifica que `REDIS_URL` sea accesible. |
| No llega el correo | Revisa SMTP, STARTTLS, remitente, Redis y salida del worker. |
| Puerto ocupado | Libera el puerto o cambia `.env`; Vite usa `strictPort`. |
| API inaccesible desde la pantalla | Comprueba ambos procesos y puertos; en desarrollo abre Vite. |

La ruta `/` confirma que Flask responde; no verifica servicios externos. Para pruebas aisladas consulta [TESTING.md](../TESTING.md).

## Migraciones con Alembic

`database/schema.sql` es el esquema base fijo, identificado como
`baseline_001`. Los cambios posteriores se guardan en
`database/migrations/versions/`.

Alembic registra la revisión aplicada en la tabla `alembic_version`
de cada base.

Ejecuta los comandos desde la raíz, con el entorno virtual activado.

### Recibir cambios del equipo

Revisa `git status` y la rama actual antes de actualizar; guarda o resuelve los cambios locales.

```powershell
git pull --ff-only
python -m pip install -r requirements.txt
python -m alembic upgrade head
```

Git descarga los archivos; Alembic aplica los cambios a tu base local.

### Crear una migración

Actualiza primero tu rama y tu base. Después ejecuta:

```powershell
python -m alembic revision -m "Describe el cambio"
```

Completa el archivo generado:

- `upgrade()`: aplica el cambio.
- `downgrade()`: revierte el cambio, cuando sea posible.

Conserva los identificadores `revision` y `down_revision` generados.
En este proyecto las migraciones se escriben manualmente; no se utiliza
`--autogenerate`.

Prueba el cambio en tu base local:

```powershell
python -m alembic upgrade head
python -m alembic current
```

Sube la migración junto con el código relacionado en el mismo pull request.

### Consultar el historial

```powershell
python -m alembic current
python -m alembic history
python -m alembic heads
```

### Reglas del equipo

- No modificar migraciones ya integradas y aplicadas.
- Crear otra migración para corregir un cambio anterior.
- No ejecutar `stamp head` para actualizar una base: omite la ejecución
  de los cambios.
- `stamp baseline_001` se utiliza únicamente al inicializar una base
  que ya contiene exactamente el esquema base.
- Revisar las migraciones antes de aplicarlas: una reversión puede
  eliminar datos.
- Si aparecen varias cabeceras (`heads`), coordinar su integración
  antes de continuar.
- Los compañeros que clonan el proyecto no deben ejecutar `alembic init`:
  la configuración ya está incluida en el repositorio.
