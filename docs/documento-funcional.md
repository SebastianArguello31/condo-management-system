# Documento Funcional General

**Proyecto:** Sistema de Gestión de Mantenimiento para Edificios y Condominios
**Curso:** Ingeniería de Software 2 — FP-UNA
**Equipo (Grupo 6):** Sebastian Arguello, Lucas Boicetta, Fernando Ibarra, Kevin Valiente

> Este documento describe el sistema en su totalidad (no cambia sprint a sprint). 

## 1. Descripción del problema

En edificios residenciales o condominios, las incidencias y solicitudes de
mantenimiento suelen reportarse de manera informal mediante portería, mensajes o
grupos de mensajería. Esto dificulta el seguimiento de los problemas, la asignación
de tareas y el control del historial de reparaciones.

## 2. Usuarios principales

| Rol | Responsabilidad |
|---|---|
| **Administrador del sistema** | Configura permisos, accesos y reglas parametrizables (edificios, tipos de incidencia, prioridades, tiempos de respuesta, políticas de reserva). |
| **Gestor de equipo de mantenimiento** | Evalúa criticidad de los casos, acepta o rechaza solicitudes, asigna tareas al personal técnico y realiza seguimiento. |
| **Técnicos** | Reciben los casos asignados, los atienden según orden de prioridad/disponibilidad y realizan el mantenimiento. |
| **Residentes** | Reportan incidencias, siguen el estado de sus casos en tiempo real y solicitan reservas de áreas comunes. |

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
- Dashboard interactivo y exportación de reportes (tiempos de resolución, volumen de incidencias, uso de espacios comunes).

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
  `incidents`, `maintenance`, `reservations`, `analytics`) se organiza internamente en
  rutas, lógica de negocio, modelos y validación.
- **Base de datos (PostgreSQL):** persistencia central, acceso vía SQLAlchemy.


## 6. Modelo de datos

Principios de diseño acordados en Sprint 1:

- **Auditoría vs. trabajo real:** `historial_incidencia` (log de cambios de estado) se
  mantiene separado de `intervenciones` (registro del trabajo técnico realizado).
- Todas las tablas usan `SERIAL` propio como PK (relaciones no identificantes).
- No existe tabla `personal` con restricción por edificio: cualquier técnico puede
  trabajar en cualquier unidad; `asignaciones` e `intervenciones` referencian
  directamente a `usuarios`.

* Mirar database/schema.sql para entender las tablas y relaciones de nuestra base de datos.

## 7. Decisión arquitectónica

**Stack:** React (frontend) + Flask (backend) + PostgreSQL/SQLAlchemy (persistencia).
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
- Todos los módulos comparten despliegue: no se pueden escalar de forma independiente.
- Mayor acoplamiento entre módulos que en una arquitectura de microservicios.
- Se considera aceptable dado el alcance y tamaño del proyecto.
