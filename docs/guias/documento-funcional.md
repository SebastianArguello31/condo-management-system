# Documento Funcional General

**Proyecto:** Sistema de Gestión de Mantenimiento para Edificios y Condominios
**Curso:** Ingeniería de Software 2 — FP-UNA
**Equipo (Grupo 6):** Sebastian Arguello, Lucas Boicetta, Fernando Ibarra, Kevin Valiente

> Describe el alcance funcional y las limitaciones actuales. Actualízalo cuando cambien las funciones o los permisos. Las instrucciones de instalación están en la [guía de ejecución](guia-ejecucion.md).

## 1. Descripción del problema

En edificios residenciales o condominios, las incidencias y solicitudes de
mantenimiento suelen reportarse de manera informal mediante portería, mensajes o
grupos de mensajería. Esto dificulta el seguimiento de los problemas, la asignación
de tareas y el control del historial de reparaciones.

## 2. Usuarios principales

| Rol | Responsabilidad |
|---|---|
| **Administrador del sistema** | Configura permisos, accesos y reglas parametrizables (edificios, tipos de incidencia, prioridades, tiempos de respuesta, políticas de reserva). |
| **Gestor de equipo de mantenimiento** | Consulta casos e indicadores, ajusta prioridades y asigna técnicos. No cambia manualmente estados ni registra intervenciones. |
| **Técnicos** | Reciben los casos asignados, los atienden según orden de prioridad/disponibilidad y realizan el mantenimiento. |
| **Residentes** | Reportan incidencias, consultan el estado de sus casos y solicitan reservas de áreas comunes. |

## 3. Necesidad atendida

- **Centralización y formalización:** reemplaza canales informales por un punto único de contacto operativo.
- **Optimización del tiempo de respuesta:** flujo de trabajo guiado por criticidad y antigüedad del ticket.
- **Trazabilidad e historial:** registro documentado para mantenimiento preventivo y auditoría.
- **Control de espacios compartidos:** automatiza disponibilidad y políticas de uso de áreas comunes.

## 4. Alcance del sistema

- Gestión de usuarios y roles (residentes, técnicos, gestores, administradores) con permisos diferenciados.
- Gestión de unidades: edificios, pisos y departamentos, asociados a sus residentes.
- Gestión de incidencias: registro, clasificación, priorización, asignación, seguimiento hasta resolución y cierre.
- Gestión de mantenimientos: asignación de tareas a técnicos y registro de intervenciones realizadas.
- Gestión de reservas: consulta de disponibilidad y solicitud de reservas de espacios comunes según políticas y horarios.
- Historial y trazabilidad de incidencias, intervenciones y reservas.
- Configuración básica: categorías, prioridades, estados y reglas parametrizables del sistema.
- Inventario de insumos: entradas, salidas, ajustes, consumo por intervención y alertas de stock bajo.
- Dashboard para ADMIN y GESTOR: incidencias, tiempos de resolución, cumplimiento de plazos, intervenciones y consumo de insumos, con filtros y consulta de registros asociados.

La exportación de reportes y los indicadores de uso de espacios comunes no forman parte del dashboard implementado. La API permite al administrador cambiar estados y registrar intervenciones, pero esos formularios del detalle actualmente se muestran solo al técnico; consulta [permisos de incidencias](#8-permisos-de-incidencias).

### Fuera de alcance (este semestre)

- Gestión financiera y contable (cuotas, expensas, pagos, morosidad).
- Contratación administrativa/contractual de proveedores externos.
- Control de acceso físico (cámaras, portones, biométricos).
- Aplicaciones móviles nativas (el proyecto se limita a plataforma web).
- Integraciones externas avanzadas (bancarias, IoT, terceros).
- IA avanzada (diagnóstico automático, predicción de fallas, decisiones autónomas).
- Mensajería vecinal tipo chat/red social; la comunicación se limita al estado de tickets y reservas.

## 5. Arquitectura del sistema

**Estilo:** Cliente-Servidor con Backend Monolítico Modular, organizado por capas y
orientado a dominios (feature-based), expuesto como API REST.

**Contenedores (nivel C4):**

- **Actores:** Residente, Técnico, Gestor de mantenimiento, Administrador.
- **Frontend (React + Vite):** SPA responsive, consume la API REST vía HTTP/JSON.
- **Backend (Flask API):** monolito modular; cada dominio (`auth`, `users`, `units`,
  `incidents`, `common_spaces`, `maintenance`, `reservations`, `analytics`) se organiza internamente en
  rutas, servicios, repositorios SQL y validación.
- **Base de datos (PostgreSQL):** persistencia central, acceso con psycopg2. Alembic y SQLAlchemy se utilizan para las migraciones.
- **Redis y worker RQ:** límites de solicitudes y procesamiento de correos de recuperación vía SMTP.


## 6. Modelo de datos

Principios de diseño acordados en Sprint 1:

- **Auditoría vs. trabajo real:** `historial_incidencia` (log de cambios de estado) se
  mantiene separado de `intervenciones` (registro del trabajo técnico realizado).
- Las claves y restricciones se definen en el esquema base y evolucionan mediante migraciones.
- No existe tabla `personal` con restricción por edificio: cualquier técnico puede
  trabajar en cualquier unidad; `asignaciones` e `intervenciones` referencian
  directamente a `usuarios`.

Consulta el [esquema base](../../database/schema.sql) y las [migraciones](../../database/migrations/versions) para conocer el modelo actual; el esquema base por sí solo no incluye los cambios posteriores.

## 7. Decisión arquitectónica

**Stack:** React (frontend) + Flask (backend) + PostgreSQL con psycopg2 (persistencia), Alembic/SQLAlchemy (migraciones).
Comunicación HTTP con API REST, intercambio de datos en JSON.

**Motivo del monolito modular:** permite mantener todas las funcionalidades en una
única aplicación, separadas por dominios (usuarios, unidades, incidencias,
mantenimiento, reservas), cada uno organizado por capas.

**Ventajas**
- Simplicidad de desarrollo y despliegue (una sola aplicación backend).
- Separación de responsabilidades por dominio y por capa.
- Facilita pruebas y mantenimiento.
- Permite evolucionar a microservicios más adelante si el sistema crece.

**Limitaciones / trade-offs**
- Todos los módulos comparten despliegue: no se pueden escalar por separado.
- Mayor acoplamiento entre módulos que en una arquitectura de microservicios.
- Se considera aceptable dado el alcance y tamaño del proyecto.


## 8. Permisos de incidencias

Los roles de la aplicación son ADMIN, GESTOR, TECNICO y RESIDENTE. ADMIN y GESTOR pueden asignar técnicos y cambiar prioridades. GESTOR consulta incidencias, historial e intervenciones, pero no cambia manualmente estados ni registra intervenciones.

Las reglas se definen en [rules.py](../../backend/app/modules/incidents/rules.py) y se aplican junto con los permisos de las rutas.

### Contrato para la pantalla de detalle

`GET /condominio/incidents/{id}` devuelve, además de los datos de la incidencia:

- `estados_permitidos`: estados a los que puede pasar la incidencia para el
  usuario autenticado. Una lista vacía significa que no hay cambios disponibles.
- `puede_registrar_intervencion`: booleano que indica si el usuario puede
  registrar una intervención en el estado actual.

Estos campos también se incluyen en las respuestas de asignación de técnico,
cambio de prioridad y cambio de estado, que devuelven el detalle actualizado.
El backend vuelve a validar las reglas al guardar, porque la incidencia puede
haber cambiado desde la consulta.

### Acciones del administrador

- `PATCH /condominio/incidents/{id}/status`, con `estado` y, opcionalmente,
  `comentario`: permite las transiciones válidas, incluido cerrar una incidencia
  resuelta y reabrirla. El historial registra al administrador que hizo el cambio.
- `POST /condominio/incidents/{id}/interventions`, con `resultado`: permite
  registrar intervenciones en estados ASIGNADA, EN_PROCESO y EN_ESPERA, siempre
  que exista un técnico asignado. El autor (`id_personal`) es el usuario
  autenticado que registra la intervención; no reemplaza al técnico asignado.

El técnico conserva acceso solo a sus incidencias asignadas. El residente no
puede registrar intervenciones y solo puede cancelar sus propias incidencias
en RECIBIDA o EN_REVISION, según las reglas existentes.

### Alcance de la interfaz

La pantalla actual muestra los formularios de estado e intervención únicamente al técnico. La API también admite estas operaciones para el administrador. Esta diferencia describe el alcance de la interfaz actual.
