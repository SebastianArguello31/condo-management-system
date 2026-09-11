## Configuración y ejecución

Requisitos: Python 3.13, Node.js compatible con Vite 8, PostgreSQL y Git.
Los comandos siguientes utilizan PowerShell y parten de la raíz del proyecto.

### 1. Preparar el entorno

Clona el repositorio, entra en su carpeta y ejecuta:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `.env` con tus credenciales locales:

```dotenv
SECRET_KEY=REEMPLAZAR_POR_UN_SECRETO
JWT_SECRET_KEY=REEMPLAZAR_POR_OTRO_SECRETO
JWT_ACCESS_TOKEN_HOURS=2

DB_HOST=localhost
DB_PORT=5432
DB_NAME=condominio
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD
```

Para generar cada secreto:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Preparar una base nueva

Crea una base vacía llamada `condominio` en PostgreSQL.

Ejecuta los siguientes comandos, adaptando usuario y base si corresponde:

```powershell
psql -h localhost -p 5432 -U postgres -d condominio -v ON_ERROR_STOP=1 -f database/schema.sql
python -m alembic stamp baseline_001
python -m alembic upgrade head
psql -h localhost -p 5432 -U postgres -d condominio -v ON_ERROR_STOP=1 -f database/seed.sql
```

Si no tienes `psql` en el PATH, puedes ejecutar los archivos SQL desde
pgAdmin respetando el mismo orden.

Este procedimiento es para una base nueva. Una base ya inicializada
con Alembic se actualiza con `python -m alembic upgrade head`.

### 3. Crear el administrador

```powershell
cd backend
python create_admin.py
```

Completa los datos solicitados. No existe registro público de usuarios.

### 4. Ejecutar el backend

Desde `backend`, con el entorno virtual activado:

```powershell
python run.py
```

La API estará disponible en http://127.0.0.1:5000.

### 5. Ejecutar el frontend

En otra terminal, desde la raíz:

```powershell
cd frontend
npm ci
npm run dev
```

Abre http://localhost:5173 e ingresa con el administrador creado.

Mantén ambas terminales abiertas. Vite reenvía las solicitudes
`/condominio` al backend durante el desarrollo.

Para que un residente pueda reportar incidencias, su usuario debe
estar asociado a una unidad mediante la tabla `residentes`.

## Migraciones con Alembic

`database/schema.sql` es el esquema base fijo, identificado como
`baseline_001`. Los cambios posteriores se guardan en
`database/migrations/versions/`.

Alembic registra la revisión aplicada en la tabla `alembic_version`
de cada base.

Ejecuta los comandos desde la raíz, con el entorno virtual activado.

### Recibir cambios del equipo

```powershell
git pull
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