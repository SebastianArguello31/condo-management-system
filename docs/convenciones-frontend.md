# Convenciones frontend — guía del kit (Dev 1, refactor FE)

Borrador a partir del plan (`docs/plan-refactor-frontend.md` §2–§8) y de la
referencia técnica (`docs/kit-ui-referencia.md`, generada del código real).
Se AMPLÍA con una línea por pantalla migrada (ver §8). Público: los demás
devs, para sus pantallas nuevas, y este proyecto.

## 1. Estructura de carpetas

```
frontend/src/
├── App.jsx                 Router por hash + providers (Toast/Confirm/ErrorBoundary)
├── main.jsx                Fuentes @fontsource + tokens/base
├── config/routing.js       ÚNICA config de rutas/roles/grupos (ver §7)
├── components/
│   ├── AppShell.jsx        Shell Bitácora
│   ├── CrudPage.jsx        CRUD genérico legacy (pantallas pendientes)
│   └── ui/                 Kit: componentes + ui.css (único CSS del kit)
├── hooks/                  useHashRoute, useQuery, useMutation, useConfirm
├── services/               api.js (cliente HTTP) + routes.js (rutas canónicas)
├── validations/            validate + rules + schemas (espejo Marshmallow)
├── utils/                  downloadAttachment.js + format.js (fechas/horas)
├── styles/                 tokens.css (única fuente visual) + base.css
└── features/<modulo>/      Pantallas por feature
```

Pantalla nueva de otro dev: el archivo va en `features/<modulo>/` estilo
LEGADO; el registro se hace en `config/routing.js` (§7). La migración al kit
la hace el dueño (Dev 1).

## 2. Uso del kit

Referencia completa por componente (props/ejemplos/a11y):
`docs/kit-ui-referencia.md`. Reglas rápidas:

- Todo va por tokens (`styles/tokens.css`): sin hex ni px sueltos.
- Radios ≤ 8px; sin sombras decorativas; sin gradientes, glassmorphism,
  emojis, iconos en círculos de color ni tarjetas dentro de tarjetas.
- Transiciones solo color/opacidad (120–160 ms), respetando
  `prefers-reduced-motion`.
- Cambios a `components/ui` SIEMPRE retrocompatibles: solo props nuevas
  opcionales; nunca perder/cambiar el significado de una prop existente.

## 3. Estados de pantalla (obligatorios en todo listado)

- **Carga** → `Skeleton` (los datos de la migración usan `useQuery`),
  SIN parpadeo de "Reintentar" al abrir (bug B9).
- **Error de carga** → `ErrorState` con Reintentar (`onRetry = reload`).
- **Vacío** → `EmptyState` con la acción real de crear (una sola
  instancia del trigger).
- `DataTable` integra los tres (`loading`, `error`, `rows`/`empty*`).
- `reload()` conserva datos previos (la lista no titila a vacío).
- La mutación va con `useMutation` (dedupe/doble envío) y el listado se
  refresca con `reload()` + Toast de éxito.

## 4. Formularios, errores y éxito (convención §2.18)

- Crear/editar en modal: `FormModal` (error de la acción DENTRO del modal
  con foco/scroll; éxito SIEMPRE por Toast del padre, no `notice` de página).
- Errores por campo: `fieldErrors = { campo: mensaje }` + `useFormFieldError(nombre)`;
  el submit valida primero en cliente con `validations/`
  (`validate(form, schema)`) y luego mapea `err.errors` del backend
  (¡trae ARRAYS por campo! normalizar a string).
- Todo input lleva `name`; `autoComplete="off"` al crear cuenta de OTRA
  persona; `given-name`/`family-name`/`email`/`tel` en perfil propio.
- El cierre del modal queda bloqueado mientras `busy`.
- Confirmaciones con `useConfirm` (+ `ConfirmDialog` ya montado en App);
  `window.confirm` PROHIBIDO en pantallas migradas.
- Errores que vienen de fuera de un modal: Toast `tone="danger"`.

## 5. Listados y fechas

- Tabla: `DataTable` (`caption` que describe, `rowKey` estable). Columna de
  acciones con `width` reservado y acciones: UNA principal como `Button
  variant="link" size="sm"` + `RowActionsMenu` para secundarias (destructivas
  marcadas `danger: true`).
- Búsqueda: `SearchInput`; filtros: `FilterBar` con etiquetas visibles.
- Filtros compartibles por query params del router
  (`#/mis-reservas?estado=PENDIENTE`) — así lo usará el dashboard.
- Fechas/HORAS: siempre `utils/format.js` (`formatDate` DD/MM/AAAA,
  `formatTime` HH:MM, `formatDateTime`) en hora local. NUNCA mostrar ISO.
- Montos/fechas numéricas/códigos: columna con `align: "right"` (ui-num,
  tabular-nums). Estados: `StatusBadge` con los presets reales del backend.

## 6. Accesibilidad

- Un solo `h1` por pantalla (PageHeader); secciones con `Section` (`h2`).
- Anillo de foco 2px (`--focus-ring`); navegación por teclado en todos los
  menús/modales (Esc cierra y devuelve el foco).
- Contraste WCAG AA estricto: 4.5:1 texto, 3:1 bordes de controles y
  glifos — verificación con `frontend/scripts/check-contrast.mjs`.
- `role="alert"` solo en errores (Alert danger / ErrorState); avisos
  informativos con `role="status"`.
- Responsive: 375 / 768 / 1280 con breakpoints 640 / 900 / 1150. Tablas →
  tarjetas apiladas <640px (data-label).

## 7. Registro de pantalla en `config/routing.js`

ITEMS → GRUPOS (ver pasos y ejemplo en `docs/kit-ui-referencia.md` §5).
Aterrizaje por rol fijado: ADMIN/TECNICO → `#/dashboard`, RESIDENTE →
`#/incidencias`. Las pantallas de otros devs navegan con
`onNavigate(clave)` (adaptador legado) y se agregan a `CLAVE_PANTALLA`
solo si su clave no coincide con el id.

## 8. Prohibiciones

- Hardcodear hex/px fuera de `styles/tokens.css` (excepción plan: líneas
  1px/2px).
- Componentes km-nuevos que replican algo del kit; añadir CSS de kit fuera
  de `ui.css`.
- `window.confirm`, `alert()` y errores de página no controlados.
- Estados de carga con parpadeo de error (B9) o listados que titilan a
  vacío en `reload`.
- Fechas ISO crudas en pantalla; textos en otro lenguaje que no sea
  español neutro (tuteo).

## 9. Registro por pantalla migrada (una línea cada una)

(ninguna todavía — se agrega una línea al cerrar cada migración:

`<Pantalla> — F2-x: migrada a kit; <lo singular>, <bug cerrado si aplica>`)

- **Mi perfil (residente, `ResidentHome`) y técnico (`EmployeeProfile`)** —
  F2-4: migradas al kit con formulario inline (validación en cliente con
  `validations/`, error de la acción en Alert + éxito en Toast, badge de
  cuenta con StatusBadge override); historiales fuera del perfil (van a
  `#/incidencias` y `#/mis-reservas`, sin pantallas nuevas); sin CSS
  nuevo.
