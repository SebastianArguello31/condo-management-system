# Referencia de la refactorización del frontend

Este resumen sustituye la bitácora de sesiones y sus listas de trabajo. Recoge la organización del frontend; no certifica pruebas visuales ni funcionales.

## Organización

- Las pantallas se agrupan por funcionalidad en `frontend/src/features/`.
- Los componentes compartidos se encuentran en `frontend/src/components/ui/`.
- Los tokens y estilos base se definen en `frontend/src/styles/`.
- La navegación por hash se configura en `frontend/src/config/routing.js`.
- El acceso HTTP se concentra en `frontend/src/services/`.

## Patrones utilizados

El kit reúne formularios, modales, tablas, mensajes, confirmaciones y estados de carga. Los hooks `useQuery` y `useMutation` coordinan consultas y acciones. `usePagination` y `Pagination` permiten dividir listados en el cliente; los filtros y el total de registros deben mantenerse separados de las filas visibles.

La validación del frontend ayuda a completar formularios. La API conserva la responsabilidad de validar datos y autorizar cada operación.

## Referencias actuales

- [Convenciones frontend](../convenciones-frontend.md).
- [Referencia del kit](../kit-ui-referencia.md).
- [Arquitectura](../estructura-proyecto.md).
- [Pruebas y sus límites](../../TESTING.md).

Los contratos deben contrastarse con los componentes vigentes. Este documento no contiene instrucciones de sesión, seguimiento de ramas ni listas de tareas.
