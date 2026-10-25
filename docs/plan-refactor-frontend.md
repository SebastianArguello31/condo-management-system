# Plan de refactorización del frontend — Dev 1 (Sprint 4, Grupo 6 IS2 FP-UNA)

Documento de persistencia del plan. La próxima sesión debe retomar desde aquí
y de `STATUS.md` (ver también la sección "Prompt de arranque" al final).

## 1. Objetivo y alcance

**Dev 1 (Sprint 4):** Refactorización y normalización del frontend
(React 19 + Vite 8, estructura feature-based en `frontend/src/features/*`):
1. Unificar estilos, componentes, formularios, tablas, filtros y mensajes.
2. Extraer componentes reutilizables y reducir código duplicado.
3. Normalizar estados de carga, error, éxito y vacío.
4. Reorganizar la navegación y separar los historiales del perfil en secciones
   o pantallas propias (el perfil concentra datos y preferencias).
5. Unificar validaciones y experiencia consistente en móvil y escritorio.
6. Mantener TODAS las funcionalidades existentes durante la refactorización.

Entregables: frontend refactorizado con base compartida, navegación clara,
`docs/convenciones-frontend.md` + `frontend/AGENTS.md` completos (fase final).

**Otros devs (no pisar):**
- Dev 2: mantenimiento — integrará **insumos dentro de las intervenciones de
  incidencias** (`features/maintenance/`, hoy vacío). IncidentsPage se
  refactoriza ANTES que reservas para habilitarlo.
- Dev 3: reportes/dashboard (`features/dashboard/` vacío). El dashboard
  enlazará a listados filtrados vía query params del router por hash.
- Dev 4: espacios/reservas (completo en develop; `GestionReservasPage` se
  migra después de IncidentsPage, coordinar antes de tocarlo).
- Roles reales del sistema: ADMIN / RESIDENTE / TECNICO.

## 2. Decisiones tomadas (aprobadas por el dueño)

1. Rol "gestor" no existe aún; la config de navegación/permisos es
   declarativa por rol para agregarlo sin tocar AppShell.
2. Navegación por hash (0 dependencias) con query params
   (`#/incidencias?estado=RECIBIDA`) vía `hooks/useHashRoute.js`.
3. Tras login, redirigir al hash solicitado si el rol lo permite; si no, a la
   pantalla por defecto del rol. Hash desconocido o sin permiso → pantalla por
   defecto (nunca pantalla en blanco), con `navigate(..., { replace: true })`.
4. Un único archivo de configuración declarativa
   (`frontend/src/config/routing.js`: Ítems → groups por rol). AppShell y App
   no conocen claves de módulos. `features/auth/navigation.js` fue eliminado.
5. **Aterrizaje por rol:** ADMIN y TECNICO → `#/dashboard`; **RESIDENTE →
   `#/incidencias`** (actualizado en la integración con develop, que trae el
   cambio del equipo: la decisión original del dueño con CP5 era ADMIN →
   `#/usuarios` y RESIDENTE/TECNICO → `#/incidencias`).
6. Token solo en memoria (sin persistencia): refresh cierra sesión. Igual que
   antes. 401 → evento "session-expired" → logout + hash limpio con replace.
7. Copy en español neutro (tuteo) para todo lo nuevo.
8. Contraste WCAG AA estricto: 4.5:1 texto, 3:1 bordes de controles y glifos;
   verificación con `frontend/scripts/check-contrast.mjs`.
9. STATUS.md se limpia al final: dejar solo "Dev 1 — refactor FE".
10. El dueño rediseña también las pantallas nuevas de los demás devs: la base
    debe cubrir listados, fichas, formularios, gráficos, filtros.
11. Única dependencia nueva: @fontsource (ibm-plex-sans/mono, source-serif-4,
    subconjuntos latin + latin-ext, autoalojados).
12. Sin Vitest ni tests frontend: verificación = `npm run build` + checklist
    manual por pantalla + guía `#/ui` en DEV.
13. **Paginación fuera de Fase 1** (decisión con CP4). Comprobado contra el
    backend: **ningún endpoint pagina** (los `LIMIT` son `LIMIT 1`; los
    schemas de query solo filtran). La paginación será feature futura del
    backend; su UI (pager + DataTable) se decide al migrar esos listados.
14. **validations/ espeja los schemas Marshmallow reales** del backend
    (solo lectura) — nada inventado; mensajes de contraseña EXACTOS del
    backend; mínimo de contraseña confirmado: ≥8 caracteres y ≤72 bytes UTF-8.
15. **api.js aditivo:** `signal` opcional → fetch; el Error conserva el
    mismo `message` de siempre y añade `err.status` y `err.errors`
    (objeto campo → mensajes; el backend lo envía como `{ error, errors }`
    con HTTP 400 en errores de marshmallow). 401/login intactos.
16. Los arneses temporales se reemplazaron por la **guía viva `#/ui`**
    (solo DEV, solo ADMIN; fuera del bundle de producción) en CP6b.
17. Dead code JS aprobado y eliminado en CP6b (ver §5). El CSS legado NO se
    borra todavía: solo se lista lo sin referencias (ver §8).
18. **Errores y éxito en modales (convención):** el error de una acción
    realizada dentro de un modal se muestra DENTRO del modal (nunca solo a
    nivel página, causa de B8); el éxito se informa con **Toast**.
19. **Autocomplete de formularios:** al crear la cuenta de OTRA persona →
    `autoComplete="off"`; en el PERFIL PROPIO → `given-name`, `family-name`,
    `email`, `tel` — y siempre con attribute `name` (causa de B2).
20. El kit expone **FormModal** (se crea en F2-1): modal con el patrón
    error-dentro/Toast-de la §2.18 ya integrado; CrudPage deja de usarse
    ahí mismo.

## 3. Dirección visual y convenciones fijas ("Bitácora técnica")

Fuente de verdad visual: **`frontend/src/styles/tokens.css`** (prohibido hex
o px hardcodeados fuera de ese archivo; las líneas de 1px/2px son la excepción
del plan). Restricciones y convenciones YA FIJADAS:

- Radios 4px controles / 6px paneles; nunca > 8px. Sin sombras decorativas
  (solo overlays). Sin gradientes, glassmorphism, emojis, iconos en círculos
  de color, ni tarjetas dentro de tarjetas.
- Breakpoints (convención, no tokens): **640px** (tablas → tarjetas apiladas,
  fichas y PageHeader a una columna), **900px**, **1150px** (contenedor
  completo). Las media queries solo usan esos tres valores.
  *Excepción legada marcada:* el drawer del shell sigue en 760px (CSS viejo)
  hasta la limpieza final (ver §8).
- Estados y avisos:
  - `Alert` es CONTROLADO: `visible` + `onDismiss` los maneja el padre (sin
    estado interno). El tono danger usa `role="alert"`.
  - `Toast`: región `aria-live="polite"` y una región aparte
    `aria-live="assertive"` reservada para tono danger.
  - Estado de error de campo: `aria-invalid` + `aria-describedby` vía `<Field>`.
  - `DataTable` integra loading (Skeleton), error (ErrorState + Reintentar) y
    vacío (EmptyState con acción). Filas ~44px, código/fechas/montos en mono
    con `tabular-nums`, `th scope="col"`.
  - Sección tipo "ficha" (`Section`): título a la izquierda, contenido a la
    derecha, regla de 1px; 1 columna <640px.
  - Timeline "bitácora" para historiales: línea de 1px, marcador con tono,
    hora en mono, estado y autor en meta.
- Sidebar: ítem activo = `aria-current="page"` + línea de 2px a la izquierda
  + peso 600 (sin píldora, sin punto). Icono distinto por ítem en `Icon.jsx`.
- Movimiento: solo transiciones de color/opacidad 120–160ms; respeta
  `prefers-reduced-motion` (ui.css apaga transiciones y spinner).
- Router de hash: `#/ruta?a=1&b=2`; anclas internas (p. ej. `#main-content`
  del skip link) NO son rutas — se conserva la pantalla actual.

## 4. Arquitectura de datos y servicios (convenciones API)

- `frontend/src/services/api.js`: `api(path, { method, body, responseType,
  signal })`. Injecta `Authorization: Bearer` del token en memoria. En error
  lanza `Error` con `message` legado (sin cambiar) + `status` + `errors`
  cuando el backend envía `{ error, errors }`. `responseType: "blob"` para
  binarios; 204 → null.
- `frontend/src/services/routes.js`: rutas canónicas del backend
  (`API_BASE = "/condominio"`).
- `frontend/src/validations/`: `validate(form, schema) → { campo: mensaje }`
  (trim como el `pre_load` del backend, excepto password; primer mensaje por
  campo). `schemas.js` espeja los schemas Marshmallow (origen citado por
  bloque): `cuenta` (+`cuentaAdmin`/`cuentaResidente`/`cuentaEmpleado`),
  `login` (password 1–200, sin política), `perfilEmpleado` (email requerido) /
  `perfilResidente` (email opcional), `contrasenaNueva`, `incidenciaCrear`,
  `incidenciaPrioridad`, `intervencionCrear`, `reservaCrear`,
  `especialidadCrear`. `rules.js` tiene las primitivas. Todavía no conectado a
  pantallas (conectar al migrar cada pantalla).
- `frontend/src/utils/downloadAttachment.js`: descarga de adjuntos (blob +
  `<a download>`). Importar desde aquí.

## 5. Checkpoints de la Fase 1 — TODOS COMPLETOS

| CP | Contenido | Estado |
|---|---|---|
| CP1 | `styles/tokens.css` + `base.css` + fuentes + `scripts/check-contrast.mjs` | **Hecho y verificado.** Build OK (solo woff2 latin/latin-ext); check-contrast exit 0, 62 pares PASA (peor: --ink-3 sobre tinte danger 4.58:1). |
| CP2 | Hooks: `useQuery`, `useMutation`, `useConfirm`, `useHashRoute` | **Hecho** (commit del dueño). `navigate(path, params, { replace })` re-dispara `hashchange`; `useQuery(fetcher, deps, { enabled })`; descarte de data por deps. |
| CP3 | UI básicos: Button, Alert controlado, Toast (assertive en danger), StatusBadge, Field/Input/Select/Textarea/Checkbox, SearchInput, EmptyState, ErrorState, Spinner/Skeleton, PageHeader | **Hecho** (commit del dueño). |
| CP4 | UI compuestos: Section, DefinitionList, Timeline, RowActionsMenu, Modal (footer + backdrop opt-in + foco), ConfirmDialog, DataTable, FilterBar | **Hecho** (commit del dueño). Paginación fuera del alcance (decisión §2.13). |
| CP5 | Router por hash + config declarativa + AppShell nuevo | **Hecho** (verificado por rol, commit del dueño). Aterrizaje §2.5. Icono Perfil/Reservas separado; clases ui-* sobre mg-modal; drawer móvil con `inert`. |
| CP6a | `api.js` aditivo (signal/status/errors) + `validations/` + `utils/downloadAttachment` | **Hecho** (verificado a mano por el dueño: login, listado, guardado, error de servidor, descarga, sesión expirada; commit). |
| CP6b | Página `#/ui` solo DEV (guía viva) + eliminación de arneses + dead code JS | **Hecho, verificado y commiteado** (`21d79f0`). |
| CP6c | Ajustes al kit (K1–K6): Field asterisco en línea; aislamiento del CSS legado (DataTable/Modal/Input/Select/Button/Alert); StatusBadge con estados reales + glifo 8px + normalización; Select igualado a Input; DataTable `align: "right"` con tabular-nums; RowActionsMenu compacto con patrón documentado | **Hecho, verificado y commiteado por el dueño.** |
| F2-1a | K7 FilterBar (alineación por base del control, etiquetas visibles); FormModal (Modal+form, §2.18: error dentro con foco/scroll, Toast de éxito fuera, errores por campo vía useFormFieldError, cierre bloqueado en busy); estados reales en la tabla demo; providers Toast/Confirm + ConfirmDialog montados una vez en App.jsx | **Hecho, verificado y commiteado por el dueño** (`111c173`). |

## 6. Mapa de carpetas del frontend (Fase 1)

```
frontend/src/
├── App.jsx                    Router por hash + config (resolución por rol,
│                              fallback con replace, login/logout, Suspense).
├── main.jsx                   Fuentes @fontsource + tokens/base + App.
├── index.css                  CSS legado (solo lectura; limpieza final).
├── config/
│   └── routing.js             ÚNICA config de rutas/roles/grupos + ruta
│                              solo DEV #/ui (lazy, no entra al bundle prod).
├── hooks/                     (barrel index.js)
│   ├── useHashRoute.js        {path, params, navigate(path, params, {replace})}.
│   ├── useQuery.js            AbortController, cancels, {enabled}, reload.
│   ├── useMutation.js         dedupe por promesa en vuelo; rethrow.
│   └── useConfirm.jsx         contexto + ConfirmProvider + useConfirmResponder.
├── components/
│   ├── AppShell.jsx           Shell Bitácora (grupos por rol, drawer inert).
│   ├── shell.css              Ajustes Bitácora del shell (solo tokens).
│   ├── CrudPage.jsx           CRUD genérico legacy (pantallas aún por migrar).
│   ├── ui/                    Componentes base (ui.css = único CSS del kit)
│   │   ├── Button / Alert / Toast / StatusBadge / Field + Input + Select +
│   │   │   Textarea + Checkbox / SearchInput / EmptyState / ErrorState /
│   │   │   Loading (Spinner/Skeleton) / PageHeader
│   │   ├── Section / DefinitionList / Timeline / RowActionsMenu /
│   │   │   Modal / FormModal (se crea en F2-1, §2.20) / ConfirmDialog /
│   │   │   DataTable / FilterBar
│   │   ├── ui.css             tokens-only; es la única fuente de estilos ui.
│   │   └── Icon.jsx           íconos (paths SVG); Perfil≠Reservas.
│   └── (Icon.jsx vive en components/ui).
├── validations/               rules.js + schemas.js + validate.js + index.js.
├── services/                  api.js + routes.js.
├── utils/
│   └── downloadAttachment.js  Descarga de adjuntos.
│   └── format.js              (NUEVO, sesión preparatoria 2026-10-24)
│                              formatDate/formatTime/formatDateTime en
│                              hora local; para F2-3..F2-5 (aún sin usar).
├── styles/
│   ├── tokens.css             Única fuente de valores visuales.
│   ├── base.css               Reset/base/utilidades (carga al final).
│   └── users-ui.css           CSS legado de shell/pantallas (se borra al final).
├── dev/
│   └── ui-guide.jsx           Guía viva #/ui (solo DEV; lazy, ADMIN).
└── features/
    ├── auth/                  Login.jsx (login.css; rediseño en fase 2).
    ├── units/                 BuildingsPage.jsx, UnitsPage.jsx.
    ├── users/                 UsersPage, EmployeesPage, AdminsPage,
    │                          SpecialtiesPage, ResidentsPage, ResidentHome,
    │                          EmployeeProfile, ManagementPage, CreateAccount,
    │                          ResidentUnits.
    ├── incidents/             IncidentsPage.jsx (modal de detalle legacy).
    ├── espacios-comunes/      EspaciosPage.jsx, SpacePolicies.jsx.
    └── reservas/              MisReservasPage.jsx, GestionReservasPage.jsx,
                               CreateReservation.jsx.
```

Eliminados en CP6b (dead code aprobado, probado con grep cero imports):
`features/users/managementConfig.js`, `features/users/EmployeeSpecialties.jsx`,
rama `buildings` + `setTimeout` sin cleanup de `UnitsPage.jsx`,
`filteredRows` de `GestionReservasPage.jsx`, arneses `dev/hooks-smoke.jsx`,
`dev/ui-smoke.jsx` y `dev/validations-smoke.jsx` (la guía `#/ui` absorbe al
 último).

## 7. Plan restante (Fase 2) — orden vigente (fijado por el dueño)

**Regla de cierre:** cada paso debe cerrar sus bugs de §7-bis; no se da por
terminado un paso mientras sus bugs sigan abiertos.

- **CP6c** `fix/kit:` ajustes al kit UI (K1–K6, detalle en STATUS.md:
  Field asterisco en línea; DataTable aislado del CSS legado y fondo/color de
  cabecera con tokens; StatusBadge con presets de estados reales y glifo 8px;
  Select `font: inherit` igualado a Input; DataTable con `align: "right"` +
  tabular-nums; RowActionsMenu con disparador compacto y patrón documentado).
  — **HECHO y commiteado por el dueño.**
- **F2-1a** `feat/kit:` (ver fila F2-1a de la tabla de §5) —
  **HECHO y commiteado por el dueño** (`111c173`).
- **F2-1b** `refactor:` CrudPage (modo nuevo con `variant="ui"`) +
  Especialidades. Cierra **B9**. **Revisión visual con capturas obligatoria
  antes de seguir.** — **HECHA (pendiente de verificar)** en la rama
  `feature/refactor-crudpage-especialidades` (nacida de
  `feature/refactor-perfil`): detalle completo en "Sesión F2-1b" más abajo.
  Especificación original: apartado siguiente.

### Especificación F2-1b (autónoma, no depende de una conversación)

**1) Antes de codificar — inventario de consumidores** (grep hecho el
2026-10-22; reverificar con grep el día de la migración por si cambió en el
merge):

| Consumidor | Props que usa | Notas |
|---|---|---|
| Especialidades (`features/users/SpecialtiesPage.jsx`) | `title`, `description`, `endpoint`, `idField`, `fields`, `columns` | La única que migra a modo nuevo |
| Edificios (`features/units/BuildingsPage.jsx`) | `title`, `description`, `endpoint`, `idField`, `fields`, `columns`, `lookups` | Modo legado hasta F2-2 |
| Unidades (`features/units/UnitsPage.jsx`) | `title`, `endpoint`, `idField`, `fields`, `columns` | Modo legado hasta F2-2 (F2-2 añade el select de unitTypes) |
| Espacios comunes (`features/espacios-comunes/EspaciosPage.jsx`) | `title`, `endpoint`, `idField`, `fields`, `columns`, `lookups`, `canDelete={false}`, `isFieldDisabled(field,row)`, `renderExtraActions(row,busy)` | Subvistas: "Ver detalle" (Modal propio) y "Políticas" → SpacePolicies. Modo legado |
| Políticas (`features/espacios-comunes/SpacePolicies.jsx`) | `title`, `endpoint` (anidado `/policies`), `updateMethod="PUT"`, `idField`, `fields`, `columns`, `lookups` | Subvista de Espacios. Modo legado |

CRUD defaults que los consumidores omiten (deben seguir vigentes):
`updateMethod="PATCH"`, `canCreate/canEdit/canDelete = true`,
`canEditRow → siempre true`, `isFieldDisabled → nunca`, `getRecordLabel`,
`lookups = []`. Ningún otro archivo usa CrudPage (verificado con grep).

**2) Regla estricta de API:** la API pública de CrudPage NO pierde ni cambia
el significado de ninguna prop existente; solo se permiten props NUEVAS
opcionales (otros devs pueden estar usándolo). Firma actual conservada:
`title, description, endpoint, updateMethod, idField, fields, columns,
lookups, renderExtraActions, canCreate, canEdit, canDelete, canEditRow,
isFieldDisabled, getRecordLabel`.

**3) Coexistencia de modos:** modo LEGADO por defecto (todo el código actual
intacto). Modo NUEVO activado solo con la prop opcional `variant="ui"`.
Solamente **Especialidades** usa el modo nuevo (se edita su invocación para
añadir `variant="ui"`); Edificios/Unidades/Espacios/Políticas siguen en
legado hasta F2-2. NO eliminar el código del modo legado hasta que
Especialidades esté verificado por el dueño (lo hace F2-2 o la limpieza
final, según alcance).

**4) Requisitos del modo nuevo (`variant="ui"`):**
- Carga con `useQuery`: estado inicial `loading` (sin parpadeo de
  "Reintentar" — cierra B9); error de carga → `ErrorState` con Reintentar;
  vacío → `EmptyState` con acción de crear.
- Tabla con `DataTable`; acción principal como enlace de texto +
  `RowActionsMenu` para secundarias (patrón K6); búsqueda con `SearchInput`
  donde hoy existe (toolbar `mg-search`).
- Crear/editar con `FormModal`: Alert `role="alert"` DENTRO del modal con
  foco/scroll; **errores por campo** desde `err.errors` (más validación en
  cliente con `validations/` — `especialidadCrear` para Especialidades);
  `name` y `autoComplete="off"` en todos los campos (§2.19); cierre
  bloqueado en busy.
- Eliminar/desactivar con `useConfirm` (adiós `window.confirm`); éxito con
  **Toast**; éxito/notice de página reproducido por Toast (convención §2.18);
  error de la acción dentro del modal (si viene de un modal).
- Conservar TODAS las funcionalidades actuales de las 5 pantallas.

**5) Checklist de verificación (las 5 pantallas, 375/768/1280, teclado):**
- [ ] Especialidades: crear/editar/eliminar; validación en cliente
      (especialidadCrear); error de backend por campo en FormModal; sin
      parpadeo de Reintentar al abrir (B9 cerrado); Toast de éxito;
      confirm de eliminación es ConfirmDialog. *(única en modo ui)*
- [ ] Edificios: idéntico CRUD + lookup de tipo de edificio intacto (modo
      legado, sin cambios visuales).
- [ ] Unidades: CRUD intacto (modo legado); "Tipo de unidad" sigue
      numérico HASTA F2-2 (B10 no se toca aquí).
- [ ] Espacios comunes: CRUD sin eliminar con confirm; campo "activo"
      deshabilitado en creación; "Ver detalle" abre el Modal propio;
      "Políticas" navega a la subvista (modo legado).
- [ ] Políticas: CRUD con updateMethod PUT + lookup de espacios; botón
      Volver funciona (modo legado).
- **F2-2** `refactor:` Edificios y Unidades; "Tipo de unidad" como **select**
  del catálogo `unitTypes`. Cierra **B10**. — **HECHA (pendiente de
  verificar)** en la rama `feature/refactor-edificios-unidades` (nacida de
  `chore/kit-rowactions-convenciones`); detalle en "Sesión F2-2" más abajo.
- **F2-3** `refactor:` Mis reservas (residente). — **HECHA (pendiente de
  verificar):** migrada al kit (PageHeader con conteos, useQuery sin
  parpadeo, DataTable con StatusBadge/RowActionsMenu y sin columna "#ID",
  cancelación useConfirm danger + useMutation + Toast, detalle con
  DefinitionList). Sin cambios en CreateReservation ni en contratos de API.
- **F2-4** `refactor:` Perfil (residente y técnico) + historiales en pantallas
  propias ("Mis incidencias" / "Mis reservas"). Cierra **B7 perfil**. —
  **HECHA (pendiente de verificar):** migrada al kit en la rama
  `feature/refactor-perfil`; detalle en "Sesión F2-4" más abajo.
- **F2-5** `refactor:` IncidentsPage en subcomponentes (tabla, form de
  creación con FormModal, modal de detalle, timeline). Cierra **B7 detalle,
  B8**. — **F2-5a HECHA (pendiente de verificar):** shell + listado +
  filtros al kit en `feature/refactor-incidencias` (detalle en "F2-5:
  análisis y plan" más abajo). **F2-5b HECHA (pendiente de verificar):**
  creación en `IncidentsCreateModal` (FormModal; cierra B8; detalle en
  "Sesión F2-5b"). F2-5c pendiente.
- **F2-6** `refactor:` ManagementPage + Residentes + CreateAccount
  (+ `validations/` cuenta/perfiles; relación residentes-unidades).
  Cierra **B1–B5**.
- **F2-7** `refactor:` Espacios + Políticas. Cierra **B6**.
- **F2-8** `refactor:` Gestión de reservas + CreateReservation.
- **F2-9** `feat:` Rediseño del Login (login.css nuevo sobre tokens;
  mantener `onLogin(result)` intacto).
- **F2-10** `refactor:` Pantallas nuevas de Dev 2 (inventario) y Dev 3
  (dashboard) cuando lleguen: el dueño las migra. El dashboard se diseña con
  el kit: cifras en serif, tokens `--chart-*`, enlaces a listados filtrados
  por hash con query params. Ambas se registran en `config/routing.js`.
- **F2-11** `style/chore:` pasada responsive + a11y, limpieza de CSS legado
  (lista en §8) y `docs/convenciones-frontend.md`.

### Contexto de integración (equipo)

- **División de trabajo:** el dueño migra TODAS las pantallas; los otros
  devs hacen backend y dejan el frontend de sus pantallas nuevas en estilo
  legado (NO refactorizan frontend).
- **Calendario:** todos hacen push mañana; el dueño resuelve los conflictos
  ese mismo día. Después de eso, los demás devs dejan de modificar el repo,
  así que para la entrega del domingo no habrá más conflictos.
- **Riesgo de merge conocido:** `features/auth/navigation.js` (eliminado) y
  el cableado de `App.jsx` y `AppShell.jsx` fueron reemplazados por
  `config/routing.js`. Las pantallas nuevas de otros devs se registran en
  `config/routing.js` al integrarlas.
- **Programación de F2-5 (IncidentsPage):** NO se programa por calendario.
  Se decide después de comprobar si Dev 2 modificó esa pantalla; si la tocó,
  se integra su cambio antes de refactorizarla.

## 7-bis. Bugs conocidos (UI)

Estado al 2026-10-22, verificados con solo lectura (evidencia de archivo/línea).
**Regla:** cada paso de migración de §7 debe cerrar sus bugs; no se da por
terminado un paso mientras sus bugs sigan abiertos.

| ID | Pantalla / rol | Síntoma | Causa | Paso que lo resuelve (§7) |
|----|----------------|---------|-------|---------------------------|
| B1 | Usuarios y accesos (admin) | Detalle en Usuarios y accesos | Por verificar | F2-6 |
| B2 | Nuevo empleado (modal, admin) | Popup de correo del navegador al escribir el nombre | Verificada: `CreateAccount.jsx:50` — inputs sin `name` ni `autoComplete` (solo password tiene) y `CrudPage.jsx:310-312`; el navegador adivina el campo y ofrece correo guardado | F2-6 (CreateAccount) |
| B3 | Nuevo empleado | Mensaje suelto bajo el botón al cerrar el modal | Verificada: `CreateAccount.jsx:44` renderiza el error como `<p>` sin estilos (`mg-alert`) fuera del modal al cerrarlo | F2-6 (CreateAccount) |
| B4 | Empleados (admin) | Detalle en Empleados | Por verificar | F2-6 |
| B5 | Residentes (admin) | Ver unidades en Residentes | Por verificar | F2-6 (relación residentes-unidades) |
| B6 | Espacios (admin) | Transición rota Espacios → Políticas de reserva | Por verificar | F2-7 |
| B7 | Incidencias (técnico) / Mi perfil | Detalle en el modal de incidencias y en Mi perfil | Por verificar | F2-5 (detalle) / F2-4 (perfil) |
| B8 | Nueva incidencia (modal, residente) | Error de backend se renderiza al fondo de la página con el modal abierto | Verificada: el `error` es estado único de página — `IncidentsPage.jsx:55` lo setea al crear y se renderiza solo a nivel página (`IncidentsPage.jsx:103`); el modal de creación (línea 105) no lo muestra adentro (el de detalle sí, línea 106) | F2-5 |
| B9 | Edificios, Unidades, Especialidades (admin) | Botón azul "Reintentar carga" parpadeante: aparece y desaparece al abrir la pantalla | Verificada: condición `!ready` en `CrudPage.jsx:239-240`; `ready` inicia `false` (línea 43) y pasa a `true` al resolver la carga (línea 78) — botón visible en cada montaje hasta que llega la lista | F2-1b (CrudPage sobre useQuery; se migra Especialidades) |
| B10 | Unidades (admin) | "Tipo de unidad" solo acepta números | Verificada: `UnitsPage.jsx:11` declara `type: "number"` → input numérico en `CrudPage.jsx:299`; el backend SÍ expone el catálogo `GET /unit-types` (`backend/app/modules/units/routes.py:16-20`). Debería ser select con lookup (como Edificios, `BuildingsPage.jsx:12-19`). **NO lo causó CP6b:** `git diff HEAD~1 HEAD` prueba que la versión anterior ya usaba `type: "number"`; el cambio solo borró la rama `buildings`/detalle/timeout | F2-2 (select del catálogo unitTypes) |

## Agenda de integración (luego de F2-1b — y quizá F2-2)

> **ORDEN RESTANTE VIGENTE (cierre de sesión F2-5b, 2026-10-25; F2-4,
> F2-1b, F2-2, F2-5a y F2-5b hechas — verificación y F2-5c antes de
> F2-6):**
> 1. **Verificación por el dueño** de F2-1b, F2-2 (incluida ronda 1),
>    F2-5a y F2-5b (checklists en STATUS.md) → abrir PRs de las ramas
>    hechas.
> 2. **F2-5b**: HECHA (creación al kit, cierra B8); queda el **detalle**
>    (ficha/timeline con los defectos de B7 que la captura confirme) y
>    **F2-5c** (pulido de la pantalla).
> 3. **docs/convenciones-frontend.md** (guía del kit para los demás,
>    parte de F2-11; ya va llevada por sesión con una línea por pantalla
>    en §9).
> 4. **F2-6 → F2-9** — resto de pantallas (pantallas de gestión, espacios +
>    políticas, gestión de reservas + CreateReservation, Login rediseño).
> 5. **F2-10** — pantallas nuevas de Dev 2 (insumos ya integró) y Dev 3
>    (dashboard): migración del dueño; enlazar drilldowns a
>    `#/incidencias?estado=...`.
> 6. **F2-11** — limpieza de CSS, responsive y a11y (unifica el marco legado
>    del shell y el ErrorBoundary global).
>
> Lo explícito del sprint tiene prioridad al elegir dentro de este orden.

> **ACTUALIZACIÓN de integración (2026-10-23):** el `merge --no-commit
> origin/develop` en `feature/refactor-frontend-base` fue resuelto:
>
> - Conflicto en `components/ui/Icon.jsx` resuelto conservando AMBOS juegos de
>   iconos (los del kit Dev 1 + `dashboard`, `chart`, `calendar`, `tool`,
>   `box`, `clock`, `trendUp`, `alertTriangle` de develop). Sin marcadores ni
>   claves duplicadas; cada icono se exporta igual (componente único
>   `<Icon name=...>`).
> - `features/auth/navigation.js` quedó eliminado y `App.jsx` con la versión
>   Dev 1 (router por hash): SIN referencias residuales a navigation.js.
> - Pantallas de otros devs registradas en `config/routing.js`: **dashboard**
>   (`#/dashboard`, "Dashboard e Indicadores", icono `dashboard`, roles
>   ADMIN/TECNICO) e **insumos** (`#/insumos`, "Insumos", icono
>   `maintenance`, roles ADMIN/TECNICO), en el grupo "Comunidad" (coherente
>   con el split PERSONAS/COMUNIDAD de su shell), en el orden de su `develop`.
> - Aterrizaje por rol: **ADMIN y TECNICO → dashboard; RESIDENTE →
>   /incidencias** (RUTA_INICIAL actualizada; §2.5 también).
> - DashboardPage recibe `onNavigate(clave)` vía adaptador en `App.jsx`
>   (`rutaDesdeClavePantalla` en `config/routing.js`: clave legada → ruta
>   hash, con soporte de query opcional; DashboardPage usa "incidents" y
>   "employees"). No se modificó DashboardPage.
> - CSS revisado: `dashboard.css` (838 líneas) es todo `.dash-*`, sin `:root`
>   ni variables del kit, sin selectores de elemento globales → no pisa
>   tokens; `base.css`/`tokens.css` no rompen sus pantallas (sus botones
>   siempre definen color por clase). No fue necesario acotar nada.
> - `IncidentsPage.jsx` conserva MI import de `downloadAttachment`
>   (`utils/`) Y su `InterventionMaterials` de Dev 2. Nota para **F2-5**:
>   al refactorizar la pantalla se debe conservar `InterventionMaterials`.
> - Siguiente paso: **F2-1b** (sin cambios de plan).

Orden fijado por el dueño: PRIMERO F2-1b (y opcionalmente F2-2 si queda
tiempo y el dueño lo autoriza); la integración con el equipo va DESPUÉS.
Todo lo demás de la agenda queda igual (los conflictos probables y el
registro en `config/routing.js` se re-evalúan al momento de integrar, por
si F2-1b/F2-2 agregan más cambios propios).

(a) **Día de integración (todos hacen push; el dueño resuelve los
conflictos el mismo día):**
1. `git fetch` + `git merge origin/develop` en la rama de Dev 1.
2. Conflictos probables según lo reemplazado: `features/auth/navigation.js`
   (eliminado del lado Dev 1), `App.jsx` y `AppShell.jsx` (cableado por hash
   + `config/routing.js`), y `package-lock.json` (resolver con una sola
   regeneración coherente; sin `npm audit fix` sin análisis).
3. Pantallas nuevas de otros devs (inventario de Dev 2, dashboard de Dev 3):
   quedan en estilo legado; se registran en `config/routing.js` al
   integrarlas (el dueño las migra después, F2-10).
4. Prueba de integración con los 3 roles (ADMIN / RESIDENTE / TECNICO):
   login, aterrizaje por rol (§2.5), navegación completa, pantallas de
   otros devs, y pantallas legacy de Dev 1 sin cambios.
5. `git push` a la rama y PR para que el dueño lo cierre.
6. Después del merge, los demás devs dejan de modificar el repo: para la
   entrega del domingo no habrá más conflictos.

## Sesión F2-3: Mis reservas (rama feature/refactor-mis-reservas)

Rama nacida de `feature/refactor-frontend-base` después de que esa base
integrara develop en el merge de la sesión anterior. **PR aún sin abrir:
abrirlo cuando se mergee el PR de `feature/refactor-frontend-base`.**

**Lo hecho:**

- **MisReservasPage migrada al kit** (commit del dueño `2b5eb3e`):
  `useQuery` con una sola consulta (reservas + espacios + tipos de evento,
  mismos endpoints que antes) con loading → Skeleton, error → ErrorState con
  Reintentar y vacío → EmptyState con el disparador REAL de "Nueva reserva"
  (única instancia, sin duplicar el trigger); `reload()` conserva datos
  previos (la lista no titila). PageHeader con título + metadatos de conteo
  ("N reservas · M pendientes"). DataTable con los estados reales
  (PENDIENTE/CONFIRMADA/RECHAZADA/CANCELADA/FINALIZADA vía StatusBadge) y sin
  columna "#ID" (id solo como rowKey); acción principal "Detalle" como enlace
  compacto; "Cancelar reserva" SOLO con estado PENDIENTE/CONFIRMADA (reglas
  de reservas/rules.py) dentro de RowActionsMenu, con useConfirm (danger) +
  useMutation + Toast de éxito y Toast danger para el error — cero
  window.confirm. Detalle: Modal + DefinitionList (mismos datos que antes).
  CreateReservation, api.js, routes.js, backend y CSS legado SIN tocar.
- **Cambios al kit (retrocompatibles; DataTable/StatusBadge solo los usan la
  guía #/ui y Mis reservas, verificado con grep):**
  - `Button`: variante **"link"** (enlace de texto, sin borde ni negrita,
    alto de fila) y **size="sm"** (compacto), aditivas; usos previos intactos.
  - `DataTable`: **marco cerrado** (`.ui-table-shell`: borde 1px `--line`,
    radio `--radius-md`, overflow hidden, sin sombras; línea superior del
    thead dibujada SOLO por el marco — sin doble línea; en `<640px` el marco
    se retira para no doblar los bordes de las tarjetas apiladas) y opción
    de columna **`width`** (colgroup con tokens) para reservar el ancho de la
    columna de Acciones, **alineada a la izquierda**: "Acciones" arranca en la
    misma x que "Detalle", con hueco SIEMPRE reservado del menú
    (`.ui-row-actions-slot`, ancho `--space-8`) en filas con o sin menú.
    *(Sesión de pulido 2026-10-24: la columna pasó a botones visibles con
    `.ui-actions-inline`; ver "Ajuste final" más abajo — el slot queda solo
    como kit retro.)*
  - `StatusBadge`: preset **FINALIZADA** (estado real del catálogo
    `estado_reservas`, database/seed.sql:528-556) con tono **info** y glifo
    **check** (border-trick de 2px, distinto del punto de CANCELADA, que
    quedó en tono **muted**); guía #/ui los muestra lado a lado.
- **Menú:** etiqueta del ítem del dashboard cambiada a **"Indicadores"**
  (antes "Dashboard e Indicadores") en `config/routing.js`.
- **Bug F2-3(β1) — pantalla en blanco:** al abrir `#/mis-reservas` TODO en
  blanco (shell incluido). Causa verificada con lectura: `data` de useQuery
  es `undefined` en el primer render y `const [rows, spaces, events] = data || []`
  sin defaults por posición dejaba `rows === undefined`; el conteo del
  encabezado (`rows.filter`) se evaluaba antes de cualquier guard → TypeError
  sin ErrorBoundary. Corregido con la mínima edición (defaults `= []` en la
  desestructuración, solo en MisReservasPage). **ErrorBoundary creado:**
  `components/ui/ErrorBoundary.jsx` (clase; console.error del error) usado en
  App.jsx alrededor de la pantalla activa con `key`/`resetKey` = ruta (se
  reinicia al navegar) y ErrorState con "Volver al inicio" → ruta por defecto
  del rol; el shell y el menú siguen vivos si una pantalla falla.
- **Ajuste final de Mis reservas (2026-10-24, tras revisar el marco cerrado):**
  - **Línea doble sobre el thead — causa real verificada (no era el th):**
    ni `index.css` (`table`/`th, td` solo border-bottom; `th` solo background)
    ni `users-ui.css` (`.mg-table th` con border-top, scoped a `.mg-table`)
    ni regla del kit pintan una línea sobre el thead; el `border-top: 0` del
    th ya lo neutralizaba. La doble real era la ADYACENCIA: la cabecera de
    página subrayada (`.ui-page-header`, border-bottom `--line` en
    ui.css:499) queda pegada a 0px del borde superior del marco
    (`.ui-table-shell` border `--line`, ui.css:897) porque PageHeader y
    DataTable son hermanos directos en la pantalla → dos líneas de 1px del
    mismo tokens se leen como una doble. Corregido en ui.css con regla
    aditiva acotada: `.ui-page-header + .ui-table-shell { margin-top:
    var(--space-4) }` (solo cuando el marco va justo tras la cabecera; la
    guía #/ui no cambia). Queda UNA línea exterior (el marco) + la
    delimitación inferior de la cabecera (th border-bottom).
  - **Columna Acciones alineada de verdad:** el desfaso era el relleno
    PROPIO del botón compacto (`.ui-btn-sm` padding-inline `--space-3`), no
    de th/td (que ya compartían `--space-3`): th y td siguen con ese relleno
    y la nueva fila `.ui-actions-inline` (ui.css) cede el relleno del primer
    control con `margin-inline-start: calc(var(--space-3) * -1)` para que el
    texto de "Detalle" arranque en la misma x que "ACCIONES". Ancho fijo de
    la columna: `calc(var(--space-12) * 4)` (192px: caben los dos botones).
  - **Acciones visibles sin menú:** la pantalla deja de usar
    `RowActionsMenu` (el componente sigue en el kit, lo usa la guía): celda
    con `.ui-actions-inline` y, en señor orden, "Detalle" (`Button
    variant="quiet" size="sm"`, con borde) y "Cancelar" (`Button
    variant="danger-ghost" size="sm"`, texto rojo sin borde) visible solo
    con PENDIENTE/CONFIRMADA; mismo flujo (useConfirm danger + useMutation +
    Toast). Ambos con texto visible y aria-label descriptivo con fecha (ISO)
    y espacio ("Cancelar reserva del 2026-10-07, Parrillera"). `.ui-row-actions-slot`
    queda sin consumir aquí (kit, retrocompatible). Button: variante
    aditiva **"danger-ghost"** (`--accent`, hover/active con
    `--status-danger-bg`; ≥5.8:1 sobre surface, ≥4.7:1 sobre el tinte,
    AA), documentada en su cabecera y mostrada en la guía #/ui.
  - **fecha en DD/MM/AAAA:** columna Fecha con `formatDate` de
    `utils/format.js` (ya existía; hora local, sin desplazar día).
  - **Cabecera de tabla más pesada (cambio de KIT, afecta a todas las
    tablas — usos verificados: Mis reservas y la guía):** `.ui-table th` con
    `--fs-13`/`--lh-13` (antes 12), weight 600 (antes 500), `--ink` (antes
    `--ink-2`), tracking normal (antes 0.02em) y fondo más marcado
    `--status-neutral-bg` (antes `--bg`), manteniendo mayúsculas y su
    border-bottom (`--line-control`). Contraste del par ≈13.5:1 (AA
    holgado); en `<640px` thead está display:none y las etiquetas de las
    tarjetas (td::before) nunca tocaron esos estilos: sin peso extra. Todo
    con tokens (cero hex, cero px sueltos); sin cambios de funcionalidad.

**Pendientes abiertos (sección propia de esta sesión):**
- [ ] **"Nueva reserva" (CreateReservation)** sigue en estilo legado — se
  toma en F2-8 (Gestión de reservas + CreateReservation).
- [ ] **Fechas en ISO** (listado y detalle): pasar a **DD/MM/AAAA en hora
  local** con una utilidad común (usarla también en F2-4 y F2-5).
  *(Utilidad creada el 2026-10-24: `utils/format.js` — formatDate/
  formatTime/formatDateTime, hora local; conectar al migrar.)*
- [ ] **Marco legado alrededor del shell** (header superior blanco, panel con
  radios grandes, pill de rol) → se unifica en **F2-11**.
- [ ] **ErrorBoundary global:** hoy vive en App.jsx por pantalla activa; al
  consolidar el shell final (F2-11) revisar límites y mensaje.
- [ ] **Menú con 12 ítems para ADMIN**: al completar pantallas, el panel deja
  de ser cómodo — decidir scroll interno (F2-11).
- [ ] **npm audit: 2 vulnerabilidades (high) sin revisar** (aporta el merge
  de develop; solo lectura, NO `npm audit fix` sin análisis).
- [ ] **Bugs B1-B10**: siguen abiertos salvo los que cierre la migración de
  cada pantalla (este paso no cerró ninguno de §7-bis: B7/B8 son de
  Incidencias/Perfil).

**Estado de commits y PR:** `2b5eb3e` (F2-3 núcleo) ya commiteado y
verificado por el dueño. Los **ajustes visuales de cierre del kit** están SIN
commit (ver "commit sugerido" en STATUS.md). PR de esta rama: **sin abrir**
hasta que se mergee el PR de `feature/refactor-frontend-base`.

## Sesión F2-1b: CrudPage variant="ui" + Especialidades (rama feature/refactor-crudpage-especialidades)

Rama nacida de `feature/refactor-perfil` (`faa0c95`). Inventario de
consumidores re-verificado con grep ANTES de editar: idéntico al cuadro de
la especificación §7-F2-1b (los 5 consumidores y sus props coinciden; el
único que omite también `description` es Unidades) → se continuó.

**Archivos tocados:**
- `frontend/src/components/CrudPage.jsx` — SOLO: import de CrudPageUi,
  renombrado interno `CrudPageLegacy` (cuerpo intacto, `git diff` lo
  prueba: 2 líneas del body sin cambios) y `export default` nuevo: un
  despachador `({ variant, ...props })` que renderiza `<CrudPageUi>` si
  `variant === "ui"` y `<CrudPageLegacy {...props}>` en el resto. Sin
  hooks condicionales; las 15 props conservan nombre y significado; la
  única prop nueva es la opcional `variant`.
- `frontend/src/components/CrudPageUi.jsx` — NUEVO. Modo "ui" con las
  mismas props (implementa TODAS, aunque Especialidades use pocas).
- `frontend/src/features/users/SpecialtiesPage.jsx` — SOLO
  `variant="ui"` en la invocación (una línea).

**Cambios al kit: NINGUNO** (`components/ui` y `ui.css` intactos; los
usos del kit en el modo nuevo ya existían: PageHeader/FilterBar/
SearchInput/DataTable/RowActionsMenu/FormModal/Field/Input/Select/
Textarea/Checkbox/Button (link/sm/primary/quiet)/EmptyState/ErrorState/
Skeleton/ErrorState de DataTable/Icon `plus`).

**Decisiones de paridad (modo legado → modo ui):**
- Carga: `useQuery` con signal (endpoint + lookups en un solo
  Promise.all), deps `[endpoint, lookups]` (mirando estabilidad:
  `EMPTY_LOOKUPS` constante de módulo como default, como el legado).
  loading → Skeleton (estado inicial: loading sin "Reintentar" → **B9
  cerrado, pendiente de verificar visualmente**), error → ErrorState con
  Reintentar, `reload()` conserva datos (sin titilar).
- Estados de página: PageHeader con `title`, meta una línea
  `"<description> · N registros"` (description existe como meta; el
  conteo de la toolbar legado se conserva ahí) y acción `canCreate`.
  Búsqueda con SearchInput en FilterBar, etiqueta visible "Buscar en
  <pantalla>", mismo criterio de filtrado (columns declaradas,
  case-insensitive). Botón "Actualizar" (reload) conservado en la misma
  fila (paridad del toolbar legado).
- Tabla: DataTable con caption "Listado de <pantalla>", rowKey
  `row[idField]`, columns del consumidor respetadas (sin render/format
  nuevos); celdas igual que el legado: boolean → "Sí"/"No", null → "—".
  Columna #ID solo porque el consumidor la declara. Sin StatusBadge: la
  columna "Estado" es un boolean (activo) y ninguna columna declara
  estado real — no se inventan presets.
- Acciones de fila: "Editar" como `Button variant="link" size="sm"`
  (canEdit + canEditRow); "Eliminar" en RowActionsMenu (`danger: true`,
  canDelete); `renderExtraActions?.(row, busy)` se sigue llamando tal
  cual (los otros 4 consumidores siguen en legado; en el modo ui su JSX
  se muestra inline a la derecha del menú — provisional hasta F2-7,
  anotado en §8-bis).
- Crear/editar: FormModal (`title` = "Crear|Editar · <título>",
  description "Registro: <getRecordLabel|##id>" al editar), cierre
  bloqueado en busy, error de la acción DENTRO (Alert role="alert" con
  foco/scroll), éxito con Toast "Cambios guardados." + reload().
  Payload IDÉNTICO al legado (trim de strings no-password, password
  omitida si vacía al editar, required → "Completa el campo <label>",
  tope 72 bytes con TextEncoder + NUEVO chequeo mínimo 8 caracteres que
  en el legado daba el navegador, nullable "" → null, multiselect →
  map(Number), select/number → Number, checkbox → boolean; skip de
  isFieldDisabled). Validación cliente con `validate(form,
  especialidadCrear)` cuando `endpoint === routes.specialties`
  (errores por campo) + `err.errors` (arrays) → `fieldErrors`
  `campo → mensajes[0]` en cualquier fallo de backend; name y
  autoComplete ("off"; "new-password" en password) en todos.
  Confirmación "Seleccionar..." y mensajes de lookups vacíos igual que
  el legado (help concatenado).
- Eliminar: useConfirm danger "Se eliminará \"<getRecordLabel|##id>\".
  No hay vuelta atrás." (label "Eliminar") + useMutation DELETE
  `${endpoint}/${id}` + Toast "Registro eliminado." + reload(); error →
  Toast danger. Cero window.confirm. Cierre del form si se elimina la
  fila editada (igual que el legado).

**Paridad NO alcanzada/desviación documentada (menor):** (1) el texto de
estado vacío del legado era único ("No hay registros que coincidan.");
el modo ui distingue "No hay registros" (+ descripción, con trigger de
crear) de "No hay registros que coincidan." (búsqueda sin resultados, sin
trigger aislado); (2) los avisos "Los cambios se guardaron, pero no se
pudo actualizar la lista: …" del legado ya no se componen: reload()
fallido muestra el ErrorState de la tabla con Reintentar (patrón de Mis
reservas). Ambas listadas en §8-bis.

**Riesgos:** (a) un consumidor futuro del modo ui que pase
`lookups={[]}` inline (literal nuevo en cada render) rompería el
deduplicado de useQuery — al migrarlo, mirar estabilidad (Especialidades
y los otros 4 usan constantes de módulo, OK); (b) F2-2 añade el select
de unitTypes a Unidades — el modo ui ya resuelve select/lookup, pero esa
pantalla migra después; (c) el dispatcher añade el import de CrudPageUi
para TODAS las pantallas legadas (bundle mínimo, sin efecto de
comportamiento: el legado no se monta).

## Sesión F2-2: Edificios y Unidades al kit (rama feature/refactor-edificios-unidades)

Rama nacida de `chore/kit-rowactions-convenciones` (`dd872ed`, que ya incluye
RowActions y createLabel/editLabel en CrudPageUi). Inventario de
consumidores re-verificado con grep ANTES de editar: Espacios y Políticas
siguen montando CrudPage LEGADO (sin `variant="ui"`, idénticas), el mismo
cuadro de la especificación §7-F2-1b → se continuó.

**Archivos tocados (solo 2):**
- `frontend/src/features/units/BuildingsPage.jsx` — SOLO props nuevas en la
  invocación: `variant="ui"`, `createLabel="Nuevo edificio"`,
  `editLabel="Editar edificio"`, `getRecordLabel={row => \`edificio
  ${row.nombre}\`}` y columna ID quitada del `columns` (id solo como
  rowKey por idField). `fields`, `columns` restantes, `lookups` (constante
  de módulo `types` → GET /building-types), endpoint, description y
  payloads SIN CAMBIOS.
- `frontend/src/features/units/UnitsPage.jsx` — `variant="ui"` + labels
  `createLabel="Nueva unidad"` / `editLabel="Editar unidad"` +
  `getRecordLabel={row => \`unidad ${row.codigo}\`}`, columna ID quitada y
  **B10 cerrado**: `id_tipo_unidad` pasó de `type: "number"` a
  `type: "select"` con `lookup: "unitTypes", optionId: "id_tipo_unidad"` —
  mismo mecanismo de `lookups` que Edificios, con `LOOKUPS` constante de
  módulo (no inline: el literal en cada render rompería el dedupe de
  useQuery) alimentada por `routes.unitTypes` (GET /unit-types, ya
  existente). `id_edificio` SIGUE `type: "number"` (hallazgo, fuera de
  alcance; ver abajo). Payloads idénticos al legado: select → Number,
  trim de strings, `codigo` requerido, sin schemas inventados (no existe
  schema en validations/ para buildings/units; solo `required` de fields).

**Cambios al kit: NINGUNO** — CrudPageUi ya cubría todo lo exigido por
convenciones `§8-bis` (RowActions Editar quiet sm + Eliminar danger-ghost
sm con aria-label vía getRecordLabel, columna Acciones width
`calc(var(--space-12) * 4)`, createLabel/editLabel sin ícono, FormModal
con name/autoComplete, error dentro + Toast). Ni un cambio en
`components/ui` ni ui.css. `CrudPage.jsx` intacto (legado no cambiado).

**Paridad (modo legado → ui):**
- Listado: UseQuery con signal (endpoint + lookups en un Promise.all,
  deps `[endpoint, lookups]`), loading → Skeleton SIN "Reintentar" al
  abrir (B9 cerrado por código: `useQuery` arranca `loading: enabled`,
  CrudPageUi:500 pasa a DataTable que renderiza Skeleton), error →
  ErrorState con Reintentar (`reload`), vacío → EmptyState con el trigger
  ("Nuevo edificio"/"Nueva unidad", única instancia). Edificios ya
  mostraba nombre de tipo y Unidades ya muestra edificio y tipo UN NOMBRE
  (`edificio`/`tipo_unidad` llegan del backend con JOIN; verificado en
  `.repositories/units.py:3-18`), no el número.
- Formularios: FormModal con título "Nuevo|Editar edificio/unidad" y
  descripción "Registro: edificio/unidad <nombre|código>", cierre
  bloqueado en busy, error de la acción DENTRO + fieldErrors de
  `err.errors`, éxito Toast "Cambios guardados." + reload sin titilar.
  Select de tipo de unidad: opciones del catálogo con "Seleccionar..."
  y help de lookups vacíos igual que el legado; al editar el valor
  inicial es el id numérico de la fila (llega en el listado).
- Eliminación: useConfirm danger ("Se eliminará "unidad U-101". No hay
  vuelta atrás.") + useMutation DELETE + Toast + reload. Cero
  window.confirm. Resto de defaults (PATCH, canCreate/canEdit/canDelete,
  canEditRow, isFieldDisabled) idénticos al legado.
- **Sin StatusBadge:** ni `edificios` ni `unidades` tienen campo
  `activo` en el esquema real (verificado en repositories) — no aplica
  el override ACTIVA/INACTIVA (regla: solo si el registro tiene campo
  activo). Fechas: ninguna columna muestra fechas (created_at no se
  mostraba en el legado ni se muestra).
- Separación --space-4 PageHeader/FilterBar/DataTable: ya resuelta por
  las reglas de adyacencia de ui.css (sin CSS nuevo).

**Pulido §8-bis evaluado ("mensaje duplicado Toast/tabla en reload
fallido"):** NO implementado. Al guardar/eliminar con éxito el Toast
informa la operación real OK y, si el reload posterior falla, la tabla
muestra ErrorState con Reintentar (son dos mensajes de cosas distintas,
sin acción duplicada y con datos previos conservados; patrón ya aceptado
en F2-1b). Reproducir el aviso combinado del legado implicaría tocar el
kit; queda anotado en §8-bis para el dueño.

**Hallazgos (SIN implementar, fuera de alcance):**
1. `Unidades` referencia al EDIFICIO con input `type: "number"`
   (`id_edificio`): mismo tratamiento candidado al select/lookup de
   Edificios (el catálogo GET /buildings existe). Se APLICÓ solo a
   `id_tipo_unidad` (B10); convertir el edificio requiere decisión del
   dueño.
2. `UnitsPage` no pasaba `description` a CrudPage legado; en modo ui
   toma el default "Administra los registros del condominio." en la meta
   del PageHeader.

**Verificación (checklist, pendiente del dueño, STATUS.md tiene la
versión completa):** Edificios y Unidades en 1280/768/375 + teclado;
crear/editar/eliminar con payload idéntico al legado (Network); B9 (sin
parpadeo de Reintentar al abrir), B10 (select con nombres del catálogo);
Espacios/Políticas SIN cambios (grep + captura).

## Sesión F2-4: Perfil + historiales fuera (rama feature/refactor-perfil)

Rama nacida de `feature/refactor-mis-reservas`. Análisis en solo lectura
APROBADO por el dueño con estas decisiones: etiqueta del menú residente
"Mi perfil"; se ACEPTA perder la columna Unidad de las incidencias del
residente (anotada en §8-bis para F2-5); los historiales NO se recrean
(van a `#/incidencias` y `#/mis-reservas`); sin enlaces a historiales
dentro del perfil (anotado en §8-bis); alcance estricto: los 2 JSX + SOLO
labels en routing.js.

### F2-4: análisis y plan (solo lectura 2026-10-24, persistido)

**a) Qué contiene hoy cada perfil.**
- Residente (`ResidentHome.jsx`, `#/mi-perfil`, routing.js:49-55): datos
  personales `GET/PATCH /residents/me` (nombre/apellido/email/telefono;
  `routes/residents.py:39-51`, solo esos 4 campos); unidades
  `GET /residents/me/units` (edificio, unidad/código, piso, tipo_unidad,
  `routes/residents.py:53-57`); **historial de incidencias** con
  `GET /incidents` (backend ya filtra residente → reporter_id en
  `incidents/services.py`); **historial de reservas** con
  `GET /reservations`. Todo en una pantalla con fetch manual y CSS legado
  (`resident-*`).
- Técnico (`EmployeeProfile.jsx`, `#/perfil`, routing.js:63-69): datos
  personales `GET/PATCH /employees/me` (`routes/employees.py:43-55`);
  especialidades (solo lectura, embebidas en el perfil); tarjeta
  **"Incidencias asignadas"** con la MISMA `GET /incidents` (backend
  filtra técnico → technician_id).

**b) Historiales a sacar y destino (verificado: el destino YA existía).**
- Incidencias del residente → `#/incidencias` (titula "Mis incidencias",
  IncidentsPage.jsx:106, misma fuente). Quitar del perfil: la tabla era
  un duplicado.
- Reservas del residente → `#/mis-reservas` (MisReservasPage, migrada al
  kit en F2-3). Quitar del perfil.
- Incidencias asignadas del técnico → `#/incidencias` (titula
  "Incidencias asignadas"). Quitar tarjeta + fetch del perfil.
- Sin rutas nuevas: `#/mi-perfil` queda datos+unidades y `#/perfil`
  datos+especialidades. Intervenciones propias: NO existe endpoint de
  listado por técnico (solo por incidencia) — no se inventa.

**c) Técnico hoy:** datos editables + especialidades (lectura) + tabla
sin acciones; cambio de estado vive en el modal de detalle de
`#/incidencias` (tarea F2-5). Sus historiales van a `#/incidencias`.

**d) "Preferencias del usuario" en el backend: NO EXISTE ninguna.** Solo
la sección self es: `GET /auth/me` (lectura de sesión), `GET/PATCH
/residents/me` + `GET /residents/me/units`, `GET/PATCH /employees/me`.
No hay cambio de contraseña self-service ni endpoints de preferencias →
NO se inventa ninguna sección (feature futura del backend).

**e) Riesgos verificados en lectura:** (1) la tabla de incidencias del
residente mostraba columna Unidad que `#/incidencias` no tiene → pérdida
menor aceptada por el dueño (§8-bis); (2) fechas ISO crudo → formatDate;
(3) riesgo de merge bajo (archivos propios de Dev 1). Backend verificado
de paso (solo lectura): schemas de perfil (`residents.py`/`employees.py`
de backend/app/modules/users/schemas) confirman email OPCIONAL en
ResidentProfileUpdateSchema y REQUERIDO en EmployeeProfileUpdateSchema —
coincide con `validations/perfilResidente`/`perfilEmpleado`;
`update_record` hace PATCH parcial (omitir campo ⇒ no se toca en DB).

### Lo hecho en esta sesión

- **`ResidentHome.jsx`** (residente, `#/mi-perfil`): quitadas las tarjetas de
  historial de incidencias y reservas + sus fetch/estados. Único
  `useQuery` (perfil + unidades, `signal`): loading → `Skeleton`, error →
  `ErrorState` con Reintentar, meta de conteo de unidades en `PageHeader`
  (título "Mi perfil y unidad", único h1). "Datos personales" en
  `Section` (badge activo/inactivo con `StatusBadge` override tone/glyph —
  sin presets nuevos; copy cambia de "Cuenta activa" a "ACTIVA") con
  `Field`/`Input` (`name` + `autoComplete` given-name/family-name/email/
  tel, §2.19), validación cliente `validations/perfilResidente`
  (`noValidate`, email opcional: vacío → se OMITE en el PATCH, el schema
  es partial y el email no se puede borrar desde acá), `err.errors`
  (arrays) → mensaje por campo (`Field`) / resto → `Alert` danger
  controlada; éxito → **Toast** + `reload()` (conserva datos, el form se
  re-sincroniza desde el perfil nuevo). Error de la ACCIÓN a nivel
  pantalla (form inline, no modal). "Mis unidades" en `DataTable`
  (Edificio/Unidad/Piso/Tipo; sin columna #ID; rowKey estable
  `id_residente:id_unidad`; EmptyState explicativo: sin unidad no puede
  reportar incidencias). `onProfileUpdated` conservado (App.jsx
  actualiza el nombre del shell).
- **`EmployeeProfile.jsx`** (técnico, `#/perfil`): mismo patrón con
  `validations/perfilEmpleado` (email requerido); QUITADA la tarjeta
  "Incidencias asignadas" y su fetch (la llamada extra a `/incidents`
  desaparece). Especialidades en `Section` de lectura con
  `DefinitionList` (nombre → Activa / "Inactiva en el catálogo") y
  EmptyState; sin clases legado (adiós `.mg-tag` ni CSS nuevo). PageHeader
  "Mi perfil" + conteo de especialidades.
- **`config/routing.js`**: SOLO label — `miPerfil` "Mi perfil y unidad" →
  **"Mi perfil"** (rutas, GRUPOS, componentes y RUTA_INICIAL intactos).
- **Docs:** línea en convenciones-frontend.md §9; §7 (F2-4 HECHA),
  ORDEN RESTANTE VIGENTE, §8 (fuente del historial RESUELTA; clases
  `resident-*` sin referencias para F2-11), §8-bis (pulido).

### Cambios al kit: NINGUNO

Ni un componente tocado — cero cambios en `components/ui` (grep de usos
previos: PageHeader/Section/DataTable/Field/Input/Alert/StatusBadge/
Skeleton/ErrorState/DefinitionList/EmptyState/Button ya cubrían todo el
perfil inline).

### B7 (parte perfil): POR VERIFICAR

El bug dice "Detalle en el modal de incidencias y en Mi perfil" con causa
"Por verificar". Por lectura NO se puede identificar el defecto del
perfil: la pantalla vieja no tenía acción "Detalle" (era una tabla plana
sin detalle). Con las tablas fuera, si el síntoma era ahí, queda sin
reproducible; si era en el modal de incidencias, es F2-5. **NO se
declara cerrado**: queda "por verificar con captura del dueño" y la parte
del modal pasa a F2-5.

### Punto 4 (reporte, sin corregir): el shell SÍ se actualiza

`AppShell.jsx:55,84` muestra `user.nombre`/`user.apellido` del estado de
`App.jsx:85-89` (`updateProfile`); ambas pantallas pasan el perfil
RESPONDIDO por el PATCH a `onProfileUpdated` (igual que hoy), así que el
nombre/initials de la cabecera y pill se actualizan tras guardar. Sin
regresión en F2-4.

### Paridad y verificación pendiente (dueño)

- [ ] Paridad RESIDENTE: cargar `#/mi-perfil` (Skeleton
  sin parpadeo), datos + unidades visibles (sin historiales), guardar los
  4 campos → Toast + shell actualizado + datos resincronizados; email mal
  formado → error por campo; email VACÍO → se omite del PATCH (opcional en
  backend);
  error de servidor → Alert danger de la acción + Toast no disparado;
  errores por campo desde `err.errors`; badge ACTIVA/INACTIVA; tabla de
  unidades (caso vacía → EmptyState "sin unidad no puedes reportar");
  `#/incidencias` y `#/mis-reservas` intactas (paridad de historiales).
- [ ] Paridad TÉCNICO: `#/perfil` (datos + especialidades, SIN tabla de
  incidencias ni fetch extra en Network), guardar → Toast + shell
  actualizado; email requerido; especialidades "Activa"/"Inactiva en el
  catálogo"; `#/incidencias` sigue mostrando "Incidencias asignadas"
  completas.
- [ ] ADMIN y `#/ui`: sin cambios (grep: las pantallas no comparten
  código con pantallas de admin; label de ADMIN intacto).
- [ ] Visual 1280/768/375 + teclado: un h1, tab correcto, foco visible en
  los 4 inputs + botón (nota: el anillo de foco legacy dentro de
  `.app-shell` ya está documentado en STATUS.md para F2-11).
- [ ] `formatDate`: confirmar que NO queda ninguna fecha en los perfiles
  (los `created_at` del backend no se mostraban antes ni se muestran ahora).
- [ ] **Commit sugerido:** `refactor(users): perfiles al kit y historiales
  fuera (F2-4)`.

## F2-5: análisis y plan (solo lectura 2026-10-25; rama feature/refactor-incidencias)

> **Nota de corrección:** el reporte original de esta sesión llegaría con
> fragmentos corruptos (glifos/teclas intercaladas); lo verificado por git y
> lectura directa del código PREVALECE y este texto es la versión corregida
> y verificada.

**a) Paridad por rol (checklist).** RESIDENTE ("Mis incidencias"):
listado que el backend filtra por `id_reportante`; columnas #ID,
Título, Tipo, Prioridad, Estado + botón "Ver detalle"; botón "Nueva
incidencia" (modal: Título min 5, Descripción min 10, Unidad (SOLO las
del residente via metadata), Tipo, nota "se registra con prioridad
Normal", Evidencias con accept de imágenes y PDF); detalle muestra
datos/tipo/estado/historial/adjuntos (Descargar); NO tiene acción de
cambio de estado en la UI (el backend le permitiría solo CANCELADA desde
RECIBIDA/EN_REVISION). TECNICO ("Incidencias asignadas"): listado
filtrado por `id_personal_asignado` (sin columna Técnico); detalle con
form de cambio de estado (opciones de `estados_permitidos` ya filtradas
por rol en el backend) + comentario ≤500, asignaciones, "Registrar
intervención" (resultado min 5) e InterventionMaterials con `canConsume`
solo de SUS intervenciones. ADMIN ("Gestión de incidencias"): todo el
listado + columna Técnico con select de asignación inline (POST
`/assignments` con Number), prioridad por select en el detalle (PATCH
`/priority`); NO tiene form de cambio de estado. Los tres descargan
adjuntos (GET `/incidents/attachments/:id` blob via
`utils/downloadAttachment`).

**b) Inventario y partición.** `IncidentsPage.jsx` (~112 líneas; JSX de
líneas gigantes tras la cabecera y el detalle). `InterventionMaterials
.jsx` (~113 líneas) — de **Dev 2, conservado intacto** (plan: NO
refactorizarlo; la pantalla lo reusa tal cual). Partición propuesta por
checkpoint: (1) shell — IncidentsPage con useQuery + PageHeader +
DataTable + filtros con query param; (2) modal de creación como
IncidentsCreateModal (FormModal + `incidenciaCrear` + límites de
adjuntos en cliente) y modal de detalle como IncidentsDetailModal
(Modal kit + DefinitionList + Timeline + prioridad/asignación/estado con
useMutation/Toast + `<InterventionMaterials>` intacto); (3) pulido.

**c) Mapa de datos.** Carga en un Promise.all: GET `/incidents` |
`/priorities` | `/statuses` | residente: `/metadata` (tipos + sus
unidades) | ADMIN: `/technicians` | técnico/ADMIN: `/maintenance/
insumos` (catálogo de consumos). Detalle: GET `/incidents/:id`
(+`estados_permitidos`, `puede_registrar_intervencion`, `adjuntos`
calculados en services), `/history`, `/assignments` (ADMIN/TEC),
`/interventions`; cada InterventionMaterials trae su propio GET
`/maintenance/intervenciones/:id/insumos`. Acciones: POST `/incidents`
(FormData multipart con adjuntos), PATCH `/priority` (ADMIN), POST
`/assignments` (ADMIN), PATCH `/status` (3 roles con `estado` +
`comentario|null`), POST `/interventions`; `onStockChanged` → recarga
del listado. El backend responde por rol: RESIDENTE solo lo reportado,
TECNICO solo lo asignado, ADMIN todo.

**d) Bugs.** B8 VERIFICADO (lectura): `error` es un único estado de
página (antes IncidentsPage:107 render página / :146 `createIncident`);
el modal de creación no lo muestra (el de detalle sí) → error visible a
nivel página con el modal abierto. Cierra en F2-5b. B7 NO identificable
por lectura; candidatos: (1) el detalle no muestra fecha de reporte/
límite, reportante, edificio ni unidad; (2) ADMIN sin acción de cambio
de estado; (3) RESIDENTE sin "Cancelar" pese a que el backend lo
permite; (4) fechas ISO crudas. NO declarar cerrado sin captura.

**e) Validaciones y límites de adjuntos.** `validations/` ya espeja el
backend: `incidenciaCrear` (título 5-150, desc 10-5000, ids enteros),
`incidenciaPrioridad`, `intervencionCrear` (5-5000); no hay reglas para
archivos (van por multipart, no por marshmallow). Límites backend
(`incidents/attachments.py`): ≤3 archivos, ≤5 MB cada uno,
.jpg/.jpeg/.png/.pdf con chequeo de firma mágica, nombre ≤200, sin
vacíos; global `MAX_CONTENT_LENGTH = 16 MB` (`app/__init__.py:36`) →
413 si el FormData total lo excede. Hoy el front solo pasa `accept`;
en 5b se validará en cliente conteo/tamaño/tipo con mensajes claros.

**f) Filtros y query params.** Hoy SIN filtros ni búsqueda. Para el
dashboard: `#/incidencias?estado=...` — el soporte ya existe:
`rutaDesdeClavePantalla(clave, params)` serializa query
(routing.js:218-223) y `useHashRoute` parsea el hash a objeto
(`{ estado: "RECIBIDA" }`). La pantalla SIEMBRA el filtro inicial desde
`params.estado` (validado contra el catálogo `/statuses`; valor
desconocido → sin filtro) y NO escribe de vuelta al hash. DashboardPage
hoy llama `onNavigate("incidents")` sin params (pantalla de Dev 3;
pasar params es F2-10).

**g) Fechas/estados/prioridades.** ISO crudo visible hoy: `history[]
.fecha` e `intervention.fecha_inicio` (y el listado trae
`fecha_reporte`/`fecha_limite` sin mostrarlos) → `formatDate/
formatDateTime` de utils/format.js al migrar. Estados: StatusBadge YA
cubre los 9 (RECIBIDA/EN_REVISION/ASIGNADA info, EN_PROCESO/EN_ESPERA
warning, RESUELTA success, RECHAZADA danger, CANCELADA muted, CERRADA
neutral; "SIN ESTADO" cae neutral/dot). Prioridades del catálogo
(seed.sql: Baja/Normal/Alta/Urgente con nivel y SLA en horas): SIN
presets de kit — presentación por módulo con override tone/glyph.

**h) Plan por checkpoint (máx 3).** F2-5a: shell + tabla + filtros
(solo IncidentsPage.jsx; modales conservados idénticos en código y
comportamiento; no cierra bugs). F2-5b: modales extraídos —
IncidentsCreateModal (FormModal, `incidenciaCrear`, límites de adjunto
en cliente y mensajes de 400/413) e IncidentsDetailModal (kit: ficha +
timeline + acciones; cierra B8 y los defectos de B7 que la captura
confirme). F2-5c: pulido — columna Unidad para RESIDENTE (ya aceptada
en F2-4), botón "Cancelar" para RESIDENTE (decisión del dueño), mover
la asignación de técnico al detalle si el dueño lo quiere,
`fecha_limite` visible, CSS legado `.mg-*` a F2-11.

**i) Riesgo de merge con Dev 2.** Verificado con git (solo lectura):
`58d58b9` (integración de InterventionMaterials) SÍ está en esta rama
(`git branch --contains`); el último commit de develop que toca
`features/incidents/` es `3d2d50b`, ya integrado en la base. PR #34
(`feature/frontend-maintenance`, mismo 58d58b9) NO es ancestro de
develop: al merge de esa rama con develop habrá conflicto en
IncidentsPage.jsx — resolver conservando imports + uso de
InterventionMaterials y el fetch de insumos (pérdida PROHIBIDA).

**j) Decisiones tomadas (preguntas del análisis, respondidas por el
dueño en el prompt del checkpoint F2-5a).** (1) QUITAR la columna #ID
(convención §8-bis; id solo rowKey). (2) La asignación de técnico queda
inline en la tabla Solo para ADMIN (mover al detalle se decide en
F2-5c). (3) Añadir columna "Reportada" con `fecha_reporte` (el listado
ya lo trae). (4) Prioridad con StatusBadge override de MÓDULO (Baja
muted/dot, Normal neutral/dot, Alta warning/triangle, Urgente danger/
diamond; resto neutral/dot; sin presets nuevos en el kit). (5)
"Cancelar para RESIDENTE" queda para el pulido (5c). (6) Títulos por
rol se mantienen. (7) Límites de adjuntos en cliente en 5b. (8) Definir
"abiertas" como estados no de cierre (REPÓRTALO: RESUELTA, CERRADA,
RECHAZADA, CANCELADA).

## Sesión F2-5b: creación de incidencias al kit (2026-10-25)

Alcance: `IncidentsCreateModal.jsx` (NUEVO) + `IncidentsPage.jsx` (solo
para montar el modal nuevo y quitar el creador legado). El modal de
DETALLE, sus formularios, intervenciones e `InterventionMaterials`
quedan INTACTOS (verificado con git diff: la línea del detalle no
cambia). Sin npm/node; sin tocar api.js, routes.js, backend, CSS legado
ni otras pantallas; CERO cambios al kit.

- **PASO 0 (diagnóstico "SIN ESTADO", solo lectura):** NO es la
  pantalla; el texto lo emite el backend:
  `backend/app/modules/incidents/repositories/incidents.py:51` usa
  `COALESCE(estado.nombre, 'SIN ESTADO') AS estado` cuando no hay
  historial. Causa de los datos: en `database/seed_demo.sql` las
  incidencias se insertaron con títulos LARGOS (líneas 301-305, p. ej.
  "Fuga en cañería principal del edificio Torre Norte - Urgente: ...")
  pero el INSERT de `historial_incidencia` (líneas 533-551) casó por
  `JOIN incidentes i ON i.titulo = h.titulo` EXACTO contra los títulos
  CORTOS (línea 588) → esas filas quedaron SIN historial → estado NULL
  → "SIN ESTADO". El frontend está correcto (`IncidentsPage` pinta
  `row.estado` tal cual con StatusBadge neutral/dot). NO se toca
  (dato/backend).
- **Paridad del modal de creación:** mismos campos y textos (Título,
  Descripción, Unidad "Edificio · código", Tipo, nota de prioridad
  Normal, Evidencias con el MISMO accept), misma FormData ("titulo",
  "descripcion", "id_unidad", "id_tipo_incidencia" y cada archivo bajo
  "archivos"), mismo endpoint POST `/incidents`, mismo éxito con Toast +
  reload (texto nuevo "Incidencia registrada." por la convención §2.18)
  y error DENTRO del modal (B8); ahora además errores por campo
  (`validate()` + `err.errors` normalizado) que el legado no mostraba.
- **Límites de adjuntos usados = REALES del backend** (attachments.py:
  8-15): ≤3 archivos, ≤5 MB cada uno, .jpg/.jpeg/.png/.pdf; mensajes por
  archivo ("<nombre> supera 5 MB", "<nombre> no es JPG, PNG ni PDF").
  La firma mágica y el nombre ≤200 quedan en el backend.
- Reglas §8-ter aplicadas sin desviarse (FormModal error DENTRO con foco
  y scroll, 413 con mensaje específico, 400 con err.errors por campo,
  éxito por Toast, cierre bloqueado en busy, Field con name/autoComplete,
  showRequiredNote, useMutation con dedupe, cero window.confirm).
- Verificación pendiente del dueño: checklist F2-5b en STATUS.md.

## 8. Pendientes y hallazgos abiertos

**Producto de Dev 1:**
- [x] Verificación final de CP6b: guía `#/ui` — completada por el dueño y
      commiteada (`21d79f0`).
- [x] **Adjuntos grandes:** el backend responde 413 al superar el límite
      (16 MB) y la UI actual solo muestra un error genérico. RESUELTO en
      F2-5b: validación de tamaño/cantidad/extensión en el cliente dentro
      de `IncidentsCreateModal` + mensaje específico de 413 en el Alert
      DENTRO del modal (quedó la firma mágica al backend).
- [x] **`StatusBadge` presets:** alineados a los estados reales del backend
      en CP6c (K3); revisar tonos/glyphs por pantalla al migrar cada una.
- [x] **Fuente de datos del historial** de incidencias residente/técnico:
      RESUELTO en F2-4 (2026-10-24, lectura del backend): `GET /incidents`
      filtra por rol en `backend/app/modules/incidents/services.py`
      (`list_incidents`: RESIDENTE → `reporter_id`, TECNICO →
      `technician_id`, ADMIN → todo). "Mis incidencias"/"Mis reservas"
      consumen el MISMO endpoint que tenía el perfil: nada se perdió.
- [ ] Drawer del shell sigue con breakpoint 760px (CSS legado); al consolidar
      AppShell final pasarlo a la convención (640px).
- [ ] ⭐ Paginación (§2.13): decidir UI (pager + DataTable) al migrar
      listados; el backend no pagina hoy.

**Pruebas NO ejecutadas** (los arneses se borraron en CP6b; probar en uso
real a medida que se migren pantallas):
- Suite `validate()` de 20 casos del arnés CP6a (el dueño solo verificó a
  mano: login, listado, guardado, error de servidor, descarga de adjunto
  pequeño, sesión expirada).
- `err.errors` renderizado por campo en un formulario real (solo se probó con
  el login vacío).
- `useQuery` con `signal`/`{ enabled }` y `useMutation` con dedupe en uso
  real (los casos del arnés CP2 sí se verificaron en su momento).
- Casos de hash del arnés CP2 (vacío, malformado, encoding %) en pantallas
  reales con filtros en la URL.
- Pruebas visuales manuales de CP1: Login y pantallas internas a 375px y
  1280px (tipografía IBM Plex visible, layout igual), teclado (Tab anillo
  2px en módulos legacy), prefers-reduced-motion.

**Ambiente/deuda técnica:**
- [ ] `npm audit`: **2 vulnerabilidades (high)** sin revisar (aporta el merge
      de develop; solo lectura; NO ejecutar `npm audit fix` sin análisis del
      dueño).
- [ ] CSS legado SIN referencias en JSX (inventario del barrido CP6b; borrar
      en la limpieza final): de `index.css`: `.topbar`, `.container`,
      `.table-container`, `.detail-grid`, `.detail-section`, `.filter-bar`,
      `.incident-*` (item, description, field, toolbar, attachment, status),
      `.timeline*` (header, item, body), `.priority-badge`, `.status-*`
      (ASIGNADA, CANCELADA, CERRADA, EN_ESPERA, EN_PROCESO, EN_REVISION,
      RECHAZADA, RECIBIDA, RESUELTA), `.login-container`, `.login-form`;
      de `users-ui.css`: `.shell-breadcrumb`, `.shell-active-dot`,
      `.mg-stats`, `.mg-stat-icon`, `.mg-identity`, `.mg-you`, `.mg-tag`,
      `.mg-tags`, `.mg-description`, `.mg-required`,
      `.mg-specialty-picker` (+ `is-selected`), `.mg-delete-button`,
      `.mg-delete-summary`, `.mg-pagination`, `.mg-bottom-note`,
      `.mg-spinner`, `.mg-avatar-square`; **nuevo tras F2-4** (el perfil ya
      no consume ninguna): `.resident-dashboard-grid`,
      `.resident-profile-card`, `.resident-units-card`,
      `.resident-history-card`, `.resident-card-heading`,
      `.resident-empty-note`, `.resident-form-actions`. (`.tabular-nums` de
      base.css no
      tiene consumidores como CLASE, pero el valor CSS
      `font-variant-numeric: tabular-nums` sí se usa en ui.css: decidir en la
      limpieza.)

## 8-bis. Pulido pendiente

Lista VACÍA. Formato de cada entrada: `- [Pantalla] — idea — alcance:
kit | pantalla`. Se llena a medida que se migran pantallas con mejoras que
NO son esenciales para cerrar el paso (las esenciales van al checklist del
paso o a §7-bis); el "pulido" se decide y ejecuta después, entrando a la
agenda cuando el dueño lo ordene.

- [IncidentsPage] — badge de estado "EN_REVISION" se parte en dos líneas
  (el badge con nowrap o abreviatura si el dueño lo decide) — alcance: kit.
- [IncidentsPage] — el placeholder de búsqueda de incidencias se corta
  ("Buscar en mis incidencias" no cabe a 1280/375) — alcance: pantalla.
- [IncidentsPage] — columna **Unidad** para el RESIDENTE (el perfil
  mostraba la unidad de cada incidencia; al sacar el historial del perfil
  se decidió PERDER esa info y añadirla acá si el dueño quiere) — alcance:
  pantalla (F2-5).
- [CrudPageUi] — `renderExtraActions` se renderiza inline junto al menú de
  fila (su JSX propio); formalizar como ítems del RowActionsMenu cuando
  Espacios migre (F2-7) — alcance: kit/UI (futuro).
- [CrudPageUi] — el modo ui distingue vacío real ("No hay registros") de
  búsqueda sin resultados ("No hay registros que coincidan."); el legado
  usaba una sola frase. Si el dueño prefiere la frase del legado en ambos
  casos, tocar solo `emptyTitle` — alcance: pantalla (futuro).
- [CrudPageUi] — los avisos combinados del legado ("se guardó, pero no se
  pudo actualizar la lista") no se reproducen: el error de reload queda
  como ErrorState de la tabla. **EVALUADO en F2-2:** no duplicado real —
  Toast opera la acción (OK verificable) y ErrorState informa el reload
  fallido con Reintentar y datos previos conservados; reproducir el aviso
  combinado tocaría el kit — alcance: kit/UI (decisión del dueño).
- [PageHeader/kit] — la meta de CrudPageUi mezcla la descripción de la
  pantalla con el conteo ("desc · N registros") en la línea mono; si se
  quiere limpio, separar descripción del meta (componente/prop) — alcance:
  kit (futuro).
- [Button/kit] — `size="sm"` mantiene 44px táctiles (alto de fila), que
  agranda las filas de tabla en desktop; evaluar 32px en escritorio con
  44px en móvil — alcance: kit.
- [RowActions/kit] — evaluar altura 32px en desktop (kit).
- [Especialidades] — placeholder de búsqueda genérico ("Buscar
  registros..."); afinarlo al contenido de la pantalla si el dueño
  quiere — alcance: pantalla.
- [Mi perfil] — enlaces directos a los historiales (#/incidencias y
  #/mis-reservas; decidido NO implementarlos en F2-4) — alcance: pantalla
  (futuro).
- [Field (kit)] — las etiquetas de 12px/`--ink-3` se leen débiles sobre
  inputs de 14px (visto en los capturas de F2-4 a 1280px) — evaluar
  13px/`--ink-2` — alcance: kit.
- [IncidentsPage] — botón **"Cancelar" para RESIDENTE** (el backend ya se
  lo permite solo desde RECIBIDA/EN_REVISION con usoConfirm; hoy solo el
  técnico cambia estado) — alcance: pantalla (F2-5c; decisión del dueño).
- [IncidentsPage] — **mover la asignación de técnico del select inline de
  la tabla al modal de detalle** (el select funciona y queda en 1280px,
  pero es una acción pesada para estar en la fila) — alcance: pantalla
  (F2-5c; decisión del dueño).
- [IncidentsPage] — **columna Unidad para el RESIDENTE** (el listado la
  trae del backend y hoy no se muestra; ya fue acordada en F2-4) —
  alcance: pantalla (F2-5c).
- [IncidentsPage] — **fecha límite (SLA) visible del registro/histórico**
  (el detalle no muestra fecha de reporte ni `fecha_limite`) — alcance:
  pantalla (F2-5c con el modal del kit).

## 8-ter. Plantilla de migración de pantalla

Checklist canónico para migrar UNA pantalla al kit (se copia al abrir un
paso F2-x; referencia técnica: `docs/kit-ui-referencia.md`, reglas:
`docs/convenciones-frontend.md`):

**Aplicar sin preguntar** (decisión fijada; detalle en convenciones
`docs/convenciones-frontend.md` §8-bis — copiar este bloque en cada
prompt de migración):
- Acciones de fila: botones visibles (Editar/Detalle = quiet sm;
  destructiva = danger-ghost sm); RowActionsMenu solo con más de 3
  acciones; aria-label con el nombre o la fecha del registro.
- Botón de crear: solo texto y nombre específico ("Nueva reserva",
  nunca "Nuevo registro"), sin ícono.
- Listados: sin columna ID (id solo como rowKey); estado siempre con
  StatusBadge; fechas con formatDate/formatDateTime; columna Acciones
  con width `calc(var(--space-12) * 4)`.
- Formularios: `.ui-form-stack` (gap --space-4, máx. ~480px) y botón en
  `.ui-form-actions` (--space-6); Field con name y autoComplete.
- Separación entre bloques: --space-4 entre PageHeader/FilterBar/
  DataTable (reglas de adyacencia de ui.css); nunca dos bloques a 0px.
- Errores: de acción dentro del modal; éxito por Toast; sin
  window.confirm.
- Perfil/formularios inline: Section + Field, error en Alert, éxito en
  Toast.

1. **Antes de codificar (solo lectura):** git status/diff/log; grep de
   consumidores related (CrudPage props, Icon usados, CSS de la pantalla);
   revisar bugs §7-bis que cierra este paso. Pedir "ok" al dueño antes de
   editar.
2. **Datos:** `useQuery` con `signal` (loading → Skeleton sin parpadeo de
   Reintentar; error → ErrorState+Reintentar; vacío → EmptyState con el
   trigger REAL de creación, única instancia); `useMutation` para guardar/
   eliminar y `reload()` (sin titilar a vacío).
3. **Listado:** `PageHeader` (título + meta de conteo, un único `h1`) +
   `DataTable` (columns/rowKey/caption, `align: "right"` para montos y
   fechas/códigos, columna de acciones con `width` reservado + enlace
   principal `Button variant="link" size="sm"` + `RowActionsMenu`,
   destructivas `danger: true`); búsqueda con `SearchInput`, filtros con
   `FilterBar` (etiquetas visibles; si el dashboard lo necesita, filtros
   por query params del hash).
4. **Formularios:** `FormModal` (error de la acción DENTRO, éxito por
   Toast del padre); validación en cliente con `validations/` (schema que
   espeje el backend) + mapeo `err.errors (arrays) → fieldErrors (string)`
   + `useFormFieldError`; cierre bloqueado en `busy`.
5. **Confirmaciones:** `useConfirm` (danger para destructivas); cero
   `window.confirm`.
6. **Detalles:** fechas/horas con `utils/format.js` (nunca ISO crudo);
   estados con `StatusBadge` (presets reales; override si el estado no
   tiene preset); `name` + `autoComplete` correcto en todos los inputs;
   adjuntos con `utils/downloadAttachment.js`.
7. **Verificación (dueño):** las 3 anchuras 375/768/1280, teclado, los
   flujos CRUD completos, errores de servidor simulados;
   checklist-documentado en STATUS.md ("Pruebas pendientes" SOLO con lo NO
   ejecutado) + commit sugerido; actualizar `docs/convenciones-frontend.md`
   §9 con una línea y registrar en §8-bis lo aplazado a "Pulido".

## Sesión de preparación para migrar pantallas (2026-10-24)

Solo lectura + archivos NUEVOS (sin tocar pantallas): base para migrar
cualquier pantalla.

- **`docs/kit-ui-referencia.md` (nuevo):** referencia técnica del kit
  generada DEL CÓDIGO REAL (`components/ui/*.jsx`, hooks, validations,
  utils, services, config/routing.js): props por componente (tipo/
  obligatoria/defecto), ejemplo mínimo y notas de a11y; catálogo de hooks;
  api()/routes; validations (ojo: `validate` devuelve UN mensaje por campo,
  `err.errors` trae ARRAYS — normalizar); tokens por categoría (nombres);
  pasos para registrar una pantalla en routing.js. Ampliarla al cambiar el kit.
- **`components/ui/ErrorBoundary.jsx`:** YA existía (F2-3); verificado que
  está envuelto en `App.jsx:132` alrededor de la pantalla activa con
  `key`/`resetKey` = `shown.path` (elemento 2 del pedido: nada que hacer).
- **`utils/format.js` (nuevo):** `formatDate` (DD/MM/AAAA), `formatTime` y
  `formatDateTime` en hora local del navegador; string solo de fecha
  (`AAAA-MM-DD`) se construye en hora local para no desplazar el día; todo
  devuelve `""` sin dato válido. Sin consumidores todavía (F2-3 lo adopta).
- **`docs/convenciones-frontend.md` (nuevo, borrador):** estructura de
  carpetas, uso del kit, estados, errores en modales, validaciones,
  a11y, prohibiciones. Se amplía con UNA LÍNEA por pantalla migrada (§9).
- **Nuevas secciones del plan:** §8-bis "Pulido pendiente" (lista vacía,
  formato pantalla — idea — alcance kit/pantalla) y §8-ter "Plantilla de
  migración de pantalla" (checklist canónico por paso F2-x).

## 9. Prompt de arranque

"Lee docs/plan-refactor-frontend.md (y STATUS.md) y frontend/AGENTS.md.
Resume en 5 líneas dónde estamos (último checkpoint hecho y verificado,
trabajo sin commit, PRs pendientes), qué pruebas faltan y cuál es el
siguiente paso según el bloque ORDEN RESTANTE VIGENTE. No cambies nada
hasta que yo confirme. Reglas fijas: sin npm/node ni git de escritura
(git solo lectura); español, formal, con tuteo; solo se usan tokens de
styles/tokens.css (sin hex ni px sueltos); cambios en components/ui siempre
retrocompatibles; al cerrar la sesión, persiste todo el avance en este
plan y en STATUS.md."

## 10. Checklist de cierre de sesión

Al terminar cada sesión (sin memoria la siguiente), ANTES de que el dueño
haga commit/push, marcar todo aquí:

- [ ] Nueva sección de sesión en este plan con lo hecho (o sección del
      checkpoint correspondiente del §7).
- [ ] Pendientes abiertos actualizados (bugs §7-bis, ambiente, lo propio).
- [ ] Bloque ORDEN RESTANTE VIGENTE vigente y con el próximo paso primero.
- [ ] STATUS.md: "Estado" con último checkpoint hecho/verificado/commiteado
      (o los ajustes sin commit + commit sugerido), "Pruebas pendientes"
      SOLO con lo no ejecutado y "Regla permanente" vigente.
- [ ] "Prompt de arranque" (§9) sigue al final y actualizado.
