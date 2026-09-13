# Arquitectura y estructura del proyecto

## 1. Arquitectura

El sistema utiliza una Arquitectura Cliente-Servidor con un Backend Monolítico Modular, 
organizado por capas y orientado a dominios (Feature-based).

Sus componentes son:

- Frontend: React con Vite.
- Backend: Python con Flask.
- Base de datos: PostgreSQL.
- Acceso a datos: consultas SQL mediante psycopg2.
- Validación: Marshmallow.
- Autenticación: JWT mediante PyJWT.
- Contraseñas: hashes generados con bcrypt.
- Adjuntos: archivos almacenados en el servidor y metadatos en PostgreSQL.

El frontend y el backend se comunican mediante una API REST.

Las solicitudes habituales utilizan JSON. El envío de incidencias con
archivos utiliza multipart/form-data. Las descargas devuelven el archivo
solicitado después de verificar autenticación y permisos.

## 2. Estructura general

```text
condo/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── db_helpers.py
│   │   │   ├── decorators.py
│   │   │   ├── security.py
│   │   │   └── validation.py
│   │   │
│   │   └── modules/
│   │       ├── auth/
│   │       │   ├── __init__.py
│   │       │   ├── routes.py
│   │       │   ├── schemas.py
│   │       │   └── services.py
│   │       ├── users/
│   │       │   ├── __init__.py
│   │       │   ├── routes.py
│   │       │   ├── schemas.py
│   │       │   └── services.py
│   │       ├── units/
│   │       │   ├── __init__.py
│   │       │   ├── routes.py
│   │       │   ├── schemas.py
│   │       │   └── services.py
│   │       ├── incidents/
│   │       │   ├── __init__.py
│   │       │   ├── routes.py
│   │       │   ├── schemas.py
│   │       │   └── services.py
│   │       ├── maintenance/          # Pendiente
│   │       ├── reservations/         # Pendiente
│   │       └── analytics/            # Pendiente
│   │
│   ├── instance/                    # Generada por la aplicación
│   │   └── uploads/
│   │       └── incidents/
│   ├── tests/                       # Prevista para pruebas
│   ├── create_admin.py
│   └── run.py
│
├── frontend/
│   ├── public/                      # Recursos públicos, opcional
│   ├── src/
│   │   ├── assets/                  # Recursos importados, opcional
│   │   ├── components/
│   │   │   └── CrudPage.jsx
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   └── Login.jsx
│   │   │   ├── users/
│   │   │   │   └── UsersPage.jsx
│   │   │   ├── units/
│   │   │   │   ├── BuildingsPage.jsx
│   │   │   │   └── UnitsPage.jsx
│   │   │   ├── incidents/
│   │   │   │   └── IncidentsPage.jsx
│   │   │   ├── maintenance/         # Pendiente
│   │   │   ├── reservations/        # Pendiente
│   │   │   └── dashboard/           # Pendiente
│   │   ├── layouts/                 # Opcional
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrations/
│
├── docs/
│   ├── estructura-proyecto.md
│   ├── documento-funcional.md
│   ├── guia-proyecto.md
│   ├── guia-ejecucion.md
│   └── guia-basica-github.md
│
├── .env
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

## 3. Flujo de una solicitud

```text
React
  |
  | HTTP: JSON o multipart/form-data
  v
routes.py
  |
  +--> decorators.py: autenticación y permisos
  |
  +--> schemas.py: validación
  |
  v
services.py
  |
  +--> db_helpers.py / database.py
  |      |
  |      v
  |    PostgreSQL
  |
  +--> instance/uploads/incidents/
         Almacenamiento de archivos adjuntos
```

El proyecto utiliza SQL con psycopg2. No utiliza una capa de modelos SQLAlchemy.

## 4. Ejecución en desarrollo

El backend escucha en el puerto 5000.

El frontend escucha en el puerto 5173.

Vite reenvía las solicitudes cuyo prefijo es /condominio al backend,
según frontend/vite.config.js.

Ambos servidores se ejecutan simultáneamente en terminales separadas.

El proxy de Vite corresponde al entorno de desarrollo. El despliegue
debe configurar cómo se sirven el frontend y la API.