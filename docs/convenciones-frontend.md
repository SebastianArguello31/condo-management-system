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
Aterrizaje por rol fijado: ADMIN → `#/dashboard`, RESIDENTE y TECNICO →
`#/incidencias` (F2-11a: Indicadores solo para ADMIN; el hash `#/dashboard`
con sesión TECNICO cae a la pantalla por defecto del rol, nunca en blanco). Las pantallas de otros devs navegan con
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

## 8-bis. Decisiones ya tomadas (aplicalas sin preguntar en cada migración)

- **Acciones de fila:** botones VISIBLES en `.ui-actions-inline`
  (Detalle/Editar = `Button quiet size="sm"`; destructiva = `Button
  danger-ghost size="sm"`). Usa `RowActionsMenu` SOLO cuando la fila
  tenga más de 3 acciones. aria-label SIEMPRE con el nombre o la fecha
  del registro (p. ej. "Cancelar reserva del 2026-10-07, Parrillera",
  "Editar especialidad Técnico Electricista").
- **Botón de crear:** solo texto (sin ícono) y con nombre específico de
  la pantalla ("Nueva reserva", "Nueva especialidad"; nunca "Nuevo
  registro" genérico).
- **Listados:** sin columna ID (el id solo es `rowKey`, por `idField` en
  CrudPage); el ESTADO de un registro siempre con `StatusBadge` (presets
  reales o override tone/glyph, nunca color solo); fechas/horas siempre
  con `formatDate`/`formatDateTime` (`utils/format.js`); columna
  Acciones con width token `calc(var(--space-12) * 4)`.
- **Formularios:** pila de campos en `.ui-form-stack` (gap `--space-4`,
  máx. `~480px`) y el botón en `.ui-form-actions` (margen superior
  `--space-6`); en modal, los campos van en el cuerpo del `FormModal`.
  Todo control vía `Field` con `name` y `autoComplete` correctos.
- **Separación entre bloques:** `--space-4` entre PageHeader, FilterBar
  y DataTable (reglas de adyacencia existentes en `ui.css`:
  `.ui-page-header + .ui-table-shell` y `.ui-filterbar +
  .ui-table-shell`); NUNCA dos bloques del listado a 0px (dos líneas de
  1px se leen como doble).
- **Errores y éxito:** error de una acción de modal DENTRO del modal
  (FormModal: Alert danger con foco/scroll); éxito SIEMPRE por Toast del
  padre; confirmaciones con `useConfirm` — cero `window.confirm`.
- **Formularios inline (perfil y similares):** `Section` + `Field`,
  error de la acción en `Alert` danger al nivel de la sección, éxito en
  `Toast` (sin `notice` de página).

## 9. Registro por pantalla migrada (una línea cada una)

(ninguna todavía — se agrega una línea al cerrar cada migración:

`<Pantalla> — F2-x: migrada a kit; <lo singular>, <bug cerrado si aplica>`)

- **Mi perfil (residente, `ResidentHome`) y técnico (`EmployeeProfile`)** —
  F2-4: migradas al kit con formulario inline (validación en cliente con
  `validations/`, error de la acción en Alert + éxito en Toast, badge de
  cuenta con StatusBadge override); historiales fuera del perfil (van a
  `#/incidencias` y `#/mis-reservas`, sin pantallas nuevas); sin CSS
  nuevo.
- **Especialidades (`SpecialtiesPage`)** — F2-1b: primera pantalla en
  modo nuevo de `CrudPage` con `variant="ui"` (`CrudPageUi`: useQuery con
  signal sin parpadeo de Reintentar, PageHeader + FilterBar/DataTable,
  FormModal con validación en cliente `especialidadCrear`, eliminación
  con useConfirm + Toast — **cierra B9**); el resto de consumidores de
  CrudPage sigue en modo legado (sin cambios hasta F2-2/F2-7).
- **Edificios (`BuildingsPage`) y Unidades (`UnitsPage`)** — F2-2:
  migradas con `variant="ui"` (RowActions Editar/Eliminar, labels
  específicos "Nuevo/Editar edificio", "Nueva/Editar unidad", sin
  columna ID, sin StatusBadge porque no tienen campo `activo`); B10
  cerrado: tipo de unidad como select del catálogo `unit-types` (constante
  de módulo en `lookups`, misma técnica que Edificios) — el
  edificio de las unidades sigue un input numérico (pendiente de
  decisión, ver plan).
- **Incidencias (`IncidentsPage`)** — F2-5a: shell y listado al kit por
  rol (PageHeader con meta "N incidencias · M abiertas", useQuery+Skeleton
  sin parpadeo, DataTable sin columna ID con estados StatusBadge y
  prioridad con override de módulo, "Reportada" con formatDate, filters
  con semilla `?estado=` del hash) — los MODALES siguen legacy (F2-5b los
  extrae; B8 abierta); InterventionMaterials (Dev 2) intacto.
- **Incidencias (`IncidentsPage`)** — F2-5b: creación en
  `IncidentsCreateModal` (FormModal con validación en cliente
  `incidenciaCrear` + límites REALES de adjuntos del backend, error de
  la acción DENTRO — **cierra B8** —, éxito por Toast y reload sin
  titilar); modal de detalle e InterventionMaterials intactos; el badge
  "SIN ESTADO" es dato/backend, no pantalla (reportado).
- **Incidencias (`IncidentsPage`)** — F2-5c: detalle al kit en
  `IncidentsDetailModal` (useQuery con signal y contenido conservado en
  los reload, Resumen en DefinitionList con StatusBadge y fechas de
  `utils/format`, Timeline del historial, prioridad/estado/intervención
  con useMutation, error de la acción DENTRO y éxito por Toast, footer
  solo "Cerrar"; `<InterventionMaterials>` de Dev 2 intacto, con margen
  `--space-4` desde un contenedor envolvente); B7 por verificar con
  captura del dueño.
- **Usuarios, Empleados y Administradores (`UsersPage`/
  `EmployeesPage`/`AdminsPage`)** — F2-6a: tres pantallas al kit sobre
  CrudPage modo ui (sin columna ID, Creada con formatDate, estado de
  cuenta con StatusBadge override ACTIVA/INACTIVA); crear con schema de
  `validations/` (cuentaEmpleado/cuenta) y especialidades del empleado
  como checkboxes del catálogo activo (tipo aditivo "checks"); Detalle
  compartido en `AccountDetailModal` (Modal + DefinitionList, mismo GET
  /users/:id) y toggle de acceso con useConfirm/useMutation/Toast,
  deshabilitado sobre la cuenta propia; sin editar/eliminar/reset
  (criterio del dueño); B1/B4 por verificar con captura; B2/B3 cerrados
  por diseño. ManagementPage retirado; CreateAccount queda solo para
  Residentes (F2-6b).
- **Residentes (`ResidentsPage`)** — F2-6b: listado al kit (PageHeader
  con meta "N residentes", FilterBar+SearchInput que buscan también por
  unidad/edificio, DataTable sin columna ID con conteo de unidades y
  StatusBadge, dedupe por unidad igual al legado, EmptyState distinto
  para búsqueda y para vacío); crear en `ResidentCreateModal` (FormModal
  + `cuentaResidente`, errores por campo,   unidad inicial opcional del
  catálogo) y "Ver unidades" en `ResidentUnitsModal` (un h2 del Modal,
  secciones h3, error de la acción DENTRO, useConfirm danger solo al
  desvincular) — **cierra B2/B3 por diseño; B5 por verificar**; toggle
  con PATCH /residents/:id {activo}; CreateAccount y ResidentUnits
  retirados (cero consumidores).
- **Espacios comunes (`EspaciosPage`)** — F2-7a: listado al kit sobre
  CrudPage modo ui (sin columna ID, estado con StatusBadge override
  ACTIVA/INACTIVA, search+EmptyState del kit, sin Eliminar); crear/editar
  con schema `espacioCrear` de `validations/` (POST sin `activo`, PATCH
  con `activo`); Detalle en Modal + DefinitionList con GET anidado
  (Skeleton/ErrorState, footer Cerrar); Políticas seguía subvista legada
  con estado local (reemplazada por F2-7b, abajo).
- **Espacios comunes + Políticas (`EspaciosPage` / `SpacePolicies`)** —
  F2-7b: listado de espacios RE-migrado a composición del kit (patrón
  Residentes) para "fields según modo": crear SIN "Activo" (el POST no lo
  acepta) y editar CON checkbox, en un único `EspacioFormModal` (patrón
  `ResidentCreateModal`: errores por campo con err.errors, foco al primer
  inválido, Toast + reload); CrudPageUi sin tocar. "Políticas de reserva"
  subvista por HASH `#/espacios?politicas=<id>` con `useHashRoute` (F5 y
  Atrás conservan; id inexistente → EmptyState con "Volver a espacios";
  foco al h1 al entrar y al contenedor del listado al volver); CrudPage
  modo ui sobre `/common-spaces/:id/policies` con `updateMethod="PUT"`,
  idField `id_politica_reserva`, Evento/Apertura/Cierre/Aforo/Costo sin
  ID, delete con useConfirm; schema FACTORY `politicaCrear(capacidad)` en
  `validations/` con reglas cruzadas del backend (cierre>apertura,
  anticipación max≥min, duración 1–24, montos ≥0/2 decimales) y aforo
  sobre capacidad a nivel pantalla (el backend responde 409); strip
  "Volver a espacios" sobre la tabla (la acción de PageHeader del kit
  aún no existe). B6 por verificar con el dueño.
- **Mis reservas (`MisReservasPage`)** — F2-3: listado/detalle/cancelación
  al kit (useQuery sin parpadeo, DataTable con estados reales,
  RowActions visibles, detalle Modal + DefinitionList, fechas con
  formatDate). "Nueva reserva" quedó para F2-8b (abajo).
- **Gestión de reservas (`GestionReservasPage`)** — F2-8a: listado ADMIN
  a composición del kit (PageHeader con meta descripción + "N reservas ·
  M pendientes", filtros de SERVIDOR en FilterBar — espacio/estado/fecha/
  residente-Select con sembrado `?estado=` del hash sin escribir de
  vuelta —, DataTable sin ID con formatDate/StatusBadge, EmptyState distinto
  por filtro; acciones Aprobar/Rechazar/Cancelar en RowActions con
  useConfirm + useMutation + Toast — sin motivo de rechazo: el backend
  solo acepta el estado; ancho de acciones 5×--space-12 por las 3
  acciones de la fila PENDIENTE).
- **Nueva reserva (`CreateReservation`)** — F2-8b: FormModal con
  disponibilidad en useQuery (`enabled` cuando espacio+fecha+tipo están
  completos; 409 sin políticas como Alert info que NO bloquea Guardar;
  otro error → ErrorState con Reintentar local), ocupados en lista
  formatDate/formatTime, políticas en DefinitionList y CERO cálculo de
  reglas en cliente (los 409 del POST llegan a la Alert danger del
  modal); errores por campo `reservaCrear` + foco al primer inválido;
  payload y contrato { spaces, events, onCreated } idénticos al legado;
  éxito con Toast + cierre + onCreated (reload de Mis reservas); sin CSS
  nuevo.
- **Login (`Login`)** — F2-9: rediseñado al kit (Field/Input/Button
  primary/Alert danger con foco) con panel tokens-only (`.login-panel`,
  sin hex, radio --radius-md, sin sombra ni bloque de marca de color),
  etiquetas alineadas a la izquierda con glifo inline vía ReactNode de
  `Field` (regla acotada a `.login-panel` en login.css), validación en
  cliente con schema `login` (noValidate) + `err.errors` por campo,
  contrato `{ onLogin }` y payload intactos; el guard de 401 de api.js
  excluye el login (no toca api.js); sin CSS para controles (ui.css); CSS
   muerto `.login-container`/`.login-form` de index.css reportado a
   F2-11.
- **Insumos (`MaintenancePage`)** — F2-10a: shell y listado al kit
  (PageHeader con meta "desc · N insumos · M con stock bajo" de la lista
  cargada, filtros de SERVIDOR buscar/categoria/bajo_stock con vacíos
  omitidos — Buscar aplica con Enter, categoría/stock bajo al cambiar —,
  sembrado `?bajo_stock=true` sin escribir de vuelta, catálogo de
  categorías conservado en ref acumulado aunque se filtre, DataTable sin
  ID con Existencia/Stock mínimo a la derecha + plural conservador de
  unidad (`formatQuantityUnit`, singular solo en 1), Estado con override
  "Stock bajo"/"Disponible", acciones Historial (todos) + Editar/
  "Registrar movimiento" (ADMIN, unifica Entrada+Salida); los 3 modales
  legados intactos (F2-10b/10c); `formatQuantity`/InterventionMaterials
  (Dev 2) intactos).
- **Insumos (`MaintenancePage`)** — F2-10b: "Nuevo/Editar insumo" a
  FormModal en un único `InsumoFormModal` con dos modos (patrón
  `EspacioFormModal`); Categoría sigue texto libre con `<datalist>` del
  catálogo ya cargado (sin endpoint nuevo ni CSS nuevo); schemas
  `insumoCrear`/`insumoEditar` espejo exacto de `InsumoCreateSchema`/
  `InsumoUpdateSchema` (+ regla `decimal(places, min)` aditiva en
  `validations/rules.js`); números con step="any" y valores iniciales
  normalizados ("1500.00" → 1500); `activo` no expuesto ni enviado;
  validación en cliente + `err.errors` → Field, foco al primer inválido,
  error de la acción DENTRO, éxito Toast + reload sin titilar, dedupe y
  cierre bloqueado en busy; payloads/endpoints idénticos al legado;
  modales de movimiento e historial siguen legados (F2-10c).
- **Insumos (`MaintenancePage`)** — F2-10c: "Registrar movimiento" al
  kit en `MovimientoFormModal` (FormModal con schema `movimientoCrear`
  — cantidad MAYOR que 0, máx. 3 decimales; motivo 3–500 —, tipo Select
  SOLO Entrada/Salida con `required`, "Existencia actual" de la fila en
  solo lectura y los 400 del backend (stock negativo / insumo
  inactivo) DENTRO del modal con su texto exacto) e "Historial" en
  `InsumoHistorialModal` (Modal de LECTURA con useQuery + signal +
  Timeline, Skeleton/ErrorState locales, filtro de tipo en SERVIDOR
  `?tipo=` con SOLO los tipos presentes en los movimientos del insumo
  (ref acumulado, como las categorías del listado; sin movimientos no
  se muestra el filtro), fechas con formatDateTime y vacíos
  explícitos); Costo unitario del insumo OPCIONAL con hint "Opcional.
  Si lo dejas vacío, se registra 0."; Helpers de cantidades compartidos
  en `features/maintenance/quantity.js`
  (`formatQuantity`/`formatQuantityUnit`, misma lógica exacta); SIN busy
  global de pantalla (cada modal gestiona el suyo) y sin `.mg-*` en la
  página; `quantity.js` sirve a página y modales, InterventionMaterials
  conserva su copia privada (intacto).
