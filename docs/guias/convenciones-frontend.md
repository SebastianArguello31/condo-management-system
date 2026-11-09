# Convenciones frontend

Guía para mantener y ampliar pantallas. Consulta las props y ejemplos en la [referencia del kit](kit-ui-referencia.md).

## Organización

| Ruta dentro de `frontend/src` | Responsabilidad |
|---|---|
| `features/` | Pantallas organizadas por funcionalidad. |
| `components/ui/` | Componentes compartidos y estilos del kit. |
| `components/AppShell.jsx` | Estructura y navegación de la aplicación. |
| `config/routing.js` | Rutas, grupos y acceso por rol. |
| `hooks/` | Consultas, mutaciones, confirmaciones y paginación. |
| `services/` | Cliente HTTP y rutas de API. |
| `validations/` | Reglas y esquemas de formularios. |
| `utils/` | Formato de fechas, teléfonos y descargas. |
| `styles/` | Tokens y estilos base. |

## Componentes y estilos

Utiliza el kit compartido para nuevas pantallas. Mantén compatibles las props existentes al ampliarlo y documenta las nuevas opciones. Centraliza colores, espaciado y tipografía en los tokens; evita duplicar estilos de componentes en cada pantalla. Respeta `prefers-reduced-motion` en las transiciones.

## Consultas y listados

- Representa carga, error y ausencia de datos con los componentes del kit.
- Usa `ErrorState` con una acción de reintento y `EmptyState` con una acción contextual cuando corresponda.
- Usa `DataTable` con una clave de fila estable y un título accesible.
- Tras una mutación, actualiza los datos y muestra el resultado al usuario.
- Para paginación en el cliente, entrega a la tabla `pageRows` de `usePagination` y coloca `Pagination` debajo. Calcula los conteos sobre el conjunto filtrado completo.
- Usa `resetKey` para reiniciar la página al cambiar búsqueda o filtros; una recarga conserva la página mientras sea válida.

## Formularios

Utiliza `FormModal` para crear y editar en un diálogo. Presenta errores por campo y errores de la acción dentro del formulario. Valida en cliente y normaliza los arrays de mensajes recibidos del backend antes de mostrarlos.

Cada control debe tener etiqueta, `name` y un `autoComplete` apropiado. Bloquea envíos duplicados y el cierre del diálogo mientras la acción está en curso. Usa `useConfirm` para confirmaciones y el sistema de Toast para comunicar resultados.

## Navegación y permisos

Registra pantallas en `config/routing.js` y conserva los contratos de navegación de sus consumidores. El dashboard está habilitado para ADMIN y GESTOR. Ocultar una acción en la interfaz no sustituye la autorización del backend.

Para los estados de negocio utiliza los valores que devuelve la API. No inventes estados ni transiciones. Consulta el [documento funcional](documento-funcional.md#8-permisos-de-incidencias) para las reglas de incidencias.

## Formato y accesibilidad

Usa `utils/format.js` para presentar fechas y horas en formato legible. Usa `StatusBadge` para los estados y alinea los valores numéricos de forma consistente.

Mantén un encabezado principal por pantalla, etiquetas accesibles, foco visible y navegación por teclado. Los diálogos deben devolver el foco al cerrarse. Distingue alertas de error de mensajes informativos y revisa tablas y formularios en pantallas estrechas.

## Validación de cambios

Consulta la [guía de pruebas](../TESTING.md) para ejecutar las suites y compilar. Una compilación correcta no acredita la interacción en navegador: revisa los flujos afectados, formularios, estados de carga y manejo de errores según el cambio.
