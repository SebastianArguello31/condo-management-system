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
  antes de seguir.** — **SIGUIENTE**, especificación completa abajo.

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
  del catálogo `unitTypes`. Cierra **B10**.
- **F2-3** `refactor:` Mis reservas (residente). — **HECHA (pendiente de
  verificar):** migrada al kit (PageHeader con conteos, useQuery sin
  parpadeo, DataTable con StatusBadge/RowActionsMenu y sin columna "#ID",
  cancelación useConfirm danger + useMutation + Toast, detalle con
  DefinitionList). Sin cambios en CreateReservation ni en contratos de API.
- **F2-4** `refactor:` Perfil (residente y técnico) + historiales en pantallas
  propias ("Mis incidencias" / "Mis reservas"). Cierra **B7 perfil**. *(Su
  análisis se hará en otra sesión.)*
- **F2-5** `refactor:` IncidentsPage en subcomponentes (tabla, form de
  creación con FormModal, modal de detalle, timeline). Cierra **B7 detalle,
  B8**. — Ver "Programación de F2-5" abajo.
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

> **ORDEN RESTANTE (2026-10-23, decide el dueño tras la revisión de F2-3):**
> 1. **F2-4** — Perfil + historiales separados (análisis en otra sesión).
> 2. **docs/convenciones-frontend.md** (guía del kit para los demás, parte de F2-11).
> 3. **F2-1b** (CrudPage `variant="ui"` + Especialidades) y **F2-2**
>    (Edificios/Unidades, select de unitTypes → cierra B10).
> 4. **F2-5** — IncidentsPage (fechas/horas locales + CONSERVAR
>    `InterventionMaterials` de Dev 2).
> 5. Resto de §7 en su orden (F2-6…F2-11).

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

## 8. Pendientes y hallazgos abiertos

**Producto de Dev 1:**
- [x] Verificación final de CP6b: guía `#/ui` — completada por el dueño y
      commiteada (`21d79f0`).
- [ ] **Adjuntos grandes:** el backend responde 413 al superar el límite
      (16 MB) y la UI actual solo muestra un error genérico. Al migrar
      IncidentsPage: validación de tamaño/tipo en cliente + mensaje claro
      (413) y/o Alert explicativo.
- [x] **`StatusBadge` presets:** alineados a los estados reales del backend
      en CP6c (K3); revisar tonos/glyphs por pantalla al migrar cada una.
- [ ] **Fuente de datos del historial** de incidencias residente/técnico: el
      front usa GET `/incidents` (backend filtra por usuario); suposición sin
      verificar — confirmar con backend al migrar.
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
- [ ] `npm audit`: 1 vulnerabilidad high sin revisar (solo lectura; NO
      ejecutar `npm audit fix` sin análisis del dueño).
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
      `.mg-spinner`, `.mg-avatar-square`. (`.tabular-nums` de base.css no
      tiene consumidores como CLASE, pero el valor CSS
      `font-variant-numeric: tabular-nums` sí se usa en ui.css: decidir en la
      limpieza.)

## 9. Prompt de arranque

"Lee docs/plan-refactor-frontend.md y STATUS.md. Resume en 5 líneas dónde
estamos, qué falta verificar y cuál es el siguiente paso. No cambies nada
hasta que yo confirme."
