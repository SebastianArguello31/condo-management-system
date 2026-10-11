# Ejecutar los tests

Ejecuta los comandos desde la raíz del proyecto, usando PowerShell.
No necesitas iniciar el backend ni el frontend.

## 1. Instalar dependencias

```powershell
py -m pip install -r requirements.txt
```

## 2. Tests sin PostgreSQL

```powershell
$env:RUN_DB_TESTS = "0"
py -B -m unittest discover -s backend/tests -t backend -p "test_*.py" -v
```

Actualmente se detectan 46 tests: 30 pueden ejecutarse sin PostgreSQL
y 16 se omiten.

## 3. Preparar la base de pruebas

Crea en pgAdmin una base llamada `condo_management_test`.
Debe ser diferente de la base habitual del proyecto.

El usuario de PostgreSQL debe poder crear esquemas dentro de ella.

Configura estas variables en la misma ventana de PowerShell:

```powershell
$env:TEST_DB_HOST = "localhost"
$env:TEST_DB_PORT = "5432"
$env:TEST_DB_NAME = "condo_management_test"
$env:TEST_DB_USER = Read-Host "Usuario de PostgreSQL"

$clavePruebas = Read-Host "Contraseña de PostgreSQL" -AsSecureString
$credencialPruebas = [System.Net.NetworkCredential]::new("", $clavePruebas)
$env:TEST_DB_PASSWORD = $credencialPruebas.Password

Remove-Variable clavePruebas, credencialPruebas

$env:RUN_DB_TESTS = "1"
```

Estas variables no crean la base ni el usuario. Si abres otra ventana,
debes configurarlas nuevamente.

## 4. Ejecutar todos los tests

```powershell
py -B -m unittest discover -s backend/tests -t backend -p "test_*.py" -v
```

## 5. Ejecutar solo integración

```powershell
py -B -m unittest discover -s backend/tests/integration -t backend -p "test_*.py" -v
```

Las pruebas preparan automáticamente el esquema, las migraciones
y los datos. Al terminar, eliminan sus esquemas temporales.

No necesitas cargar manualmente `schema.sql` ni ejecutar Alembic
en la base de tests.

## 6. Ejecutar un archivo específico

Ejemplo para reservas:

```powershell
py -B -m unittest discover -s backend/tests/integration -t backend -p "test_reservations_db.py" -v
```

Cambia el nombre del archivo para probar otro módulo.

## Resultados

- `ok`: prueba correcta.
- `FAIL`: resultado diferente al esperado.
- `ERROR`: error durante la preparación o ejecución.
- `skipped`: prueba omitida; no se comprobó su funcionamiento.

Si aparece `No module named 'app'`, verifica que ejecutes desde
la raíz e incluyas `-t backend`.

Si falla la conexión, comprueba que PostgreSQL esté iniciado,
que la base exista y que las credenciales sean correctas.

