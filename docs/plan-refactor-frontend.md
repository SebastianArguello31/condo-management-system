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
5. **Aterrizaje por rol:** ADMIN → `#/usuarios`; **RESIDENTE y TECNICO →
   `#/incidencias`** (decisión del dueño con CP5).
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
| CP6b | Página `#/ui` solo DEV (guía viva) + eliminación de arneses + dead code JS | **Implementado.** Pendiente: verificación del dueño + commit (ver STATUS.md). |

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
│   │   │   Modal / ConfirmDialog / DataTable / FilterBar
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

## 7. Plan restante (Fase 2) — orden vigente

1. `refactor:` SpecialtiesPage, BuildingsPage, UnitsPage → CrudPage + ui
   (CRUD puro, riesgo bajo; conecta validations/especialidadCrear).
2. `refactor:` ManagementPage + ResidentsPage + CreateAccount
   (+ `validations/` cuenta/perfiles; relación residentes-unidades).
3. `refactor:` EspaciosPage / SpacePolicies (subvistas y relaciones).
4. `refactor:` IncidentsPage → subcomponentes (tabla, form de creación,
   modal de detalle, timeline) — **antes que reservas**, habilita a Dev 2
   (insumos en intervenciones).
5. `refactor:` MisReservas / GestionReservas / CreateReservation —
   **coordinar con Dev 4 antes** (riesgo alto; aquí se decide UI de
   paginación si Dev 3/4 la necesitan).
6. `refactor:` Profiles: split historiales — ResidentHome → Perfil
   (solo datos+unidades) y pantallas propias "Mis incidencias"/"Mis
   reservas"; EmployeeProfile → datos + especialidades.
7. `feat:` navegación final + AppShell consolidado (ya existe; consolidar
   breakpoints y drawer a convención 640px).
8. `style:` pasada responsive + a11y (contraste final, aria-invalid,
   dialog/inert revisados).
9. `feat:` Rediseño del Login (login.css nuevo sobre tokens; mantener
  `onLogin(result)` intacto).
10. `chore:` borrar dead code restante + CSS legado sin referencias
   (lista en §8) + `docs/convenciones-frontend.md` + limpieza final de
   STATUS.md y frontend/AGENTS.md.

## 8. Pendientes y hallazgos abiertos

**Producto de Dev 1:**
- [ ] Verificación final de CP6b: guía `#/ui` (STATUS.md tiene las casillas).
- [ ] **Adjuntos grandes:** el backend responde 413 al superar el límite
      (16 MB) y la UI actual solo muestra un error genérico. Al migrar
      IncidentsPage: validación de tamaño/tipo en cliente + mensaje claro
      (413) y/o Alert explicativo.
- [ ] **`StatusBadge` con presets provisionales:** alinearlos con los estados
      reales al migrar cada pantalla.
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
