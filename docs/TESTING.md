# Guía de pruebas

La suite actual es local y aislada. No requiere iniciar Flask o Vite ni disponer de PostgreSQL, Redis, SMTP o Docker. Python utiliza `unittest` y mocks; JavaScript utiliza `node:test`.

## Preparación y ejecución

Desde la raíz, en PowerShell y con el entorno virtual activado según el [README](../README.md):

```powershell
python -m pip install -r requirements.txt
npm --prefix frontend ci
python -B -m unittest discover -s backend/tests -t backend -p "test_*.py" -v
npm --prefix frontend test
```

No se utilizan `RUN_DB_TESTS` ni `TEST_DB_*`. `backend/tests/__init__.py` bloquea conexiones reales mediante psycopg2 y sockets durante el proceso. Mantén `-t backend` para cargar el paquete y sus protecciones.

Para ejecutar archivos específicos:

```powershell
python -B -m unittest discover -s backend/tests -t backend -p "test_reservation_rules.py" -v
node --test frontend/tests/validation.test.js
```

## Cobertura y límites

- Backend: autenticación, permisos, reglas de reservas e incidencias, recuperación de contraseña, adjuntos, indicadores, helpers de datos e integridad del código.
- Frontend: validación y utilidades de teléfonos.
- No se comprueban consultas contra PostgreSQL real, migraciones ejecutadas, SMTP, cola Redis ni flujos completos en navegador. Actualmente no existe una suite en `backend/tests/integration`.

Para verificar también la compilación:

```powershell
npm --prefix frontend run build
```

La compilación no sustituye una revisión funcional en navegador.

## Resultados y diagnóstico

`ok` o `pass` indica éxito; `FAIL` indica un resultado inesperado; `ERROR`, un fallo de preparación o ejecución; `skipped`, una prueba que no se ejecutó.

Si aparece `No module named 'app'`, ejecuta desde la raíz e incluye `-t backend`. Si falta una dependencia, verifica el intérprete del entorno virtual. Un `ExternalConnectionError` indica que falta sustituir una dependencia por un mock; no se resuelve configurando una base real.

Ubica nuevos tests en `backend/tests/test_*.py` o `frontend/tests/*.test.js`. Simula las dependencias en el módulo donde se utilizan e incluye casos de permisos y errores cuando afecten al comportamiento.
