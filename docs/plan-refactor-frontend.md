# Plan de refactorización del frontend — Dev 1 (Sprint 4, Grupo 6 IS2 FP-UNA)

Documento de persistencia del plan. La próxima sesión debe retomar desde aquí
y de `STATUS.md`.

## 1. Objetivo y alcance

**Dev 1 (Sprint 4):** Refactorización y normalización del frontend
(React + Vite, estructura feature-based en `frontend/src/features/*`):
1. Unificar estilos, componentes, formularios, tablas, filtros y mensajes.
2. Extraer componentes reutilizables y reducir código duplicado.
3. Normalizar estados de carga, error, éxito y vacío.
4. Reorganizar la navegación y separar los historiales del perfil en secciones
   o pantallas propias (el perfil concentra datos y preferencias).
5. Unificar validaciones y experiencia consistente en móvil y escritorio.
6. Mantener TODAS las funcionalidades existentes durante la refactorización.

Entregable: frontend refactorizado con base compartida, navegación clara,
historiales separados y documentación de convenciones
(`frontend/AGENTS.md` + `docs/convenciones-frontend.md` — fase final).

**Otros devs (no pisar):**
- Dev 2: mantenimiento — integrará **insumos dentro de las intervenciones de
  incidencias** (`features/maintenance/`, hoy vacío, `.gitkeep`). IncidentsPage
  se refactoriza ANTES que reservas para habilitarlo.
- Dev 3: reportes/dashboard (`features/dashboard/`, hoy vacío). El dashboard
  enlazará a listados filtrados vía query params del router por hash.
- Dev 4: espacios/reservas (completo en develop; `GestionReservasPage` se
  migra después de IncidentsPage, coordinar antes de tocarlo).
- Nota: roles en el sistema hoy: ADMIN / RESIDENTE / TECNICO.

## 2. Decisiones tomadas (aprobadas por el dueño del sprint)

1. Rol "gestor" **no existe aún**; la config de navegación/permisos es
   declarativa por rol para agregarlo sin tocar AppShell.
2. Navegación: estado + sincronización con `location.hash` (0 dependencias),
   con **query params** (`#/incidencias?estado=RECIBIDA&prioridad=ALTA`) vía
   hook `useHashRoute()` → `{ path, params, navigate(path, params) }`.
3. Tras login, redirigir al hash solicitado si el rol lo permite; si no, a la
   pantalla por defecto del rol. Hash desconocido o sin permiso → pantalla por
   defecto (nunca pantalla en blanco).
4. Un único archivo de configuración declarativa (rol → grupos → ítems →
   ruta, icono, etiqueta). AppShell no conoce claves de módulos.
5. Eliminar dead code confirmado: `features/users/managementConfig.js`,
   `features/users/EmployeeSpecialties.jsx`, rama `buildings` de
   `UnitsPage.jsx`, CSS muerto (`index.css`: `.topbar`, `nav/.actions` viejo,
   `.incident-*`, `.filter-bar`, `.detail-grid/-section`, `.timeline*`,
   `.priority-badge`), `filteredRows` de `GestionReservasPage`,
   `setTimeout` sin cleanup de `UnitsPage`.
6. Token solo en memoria (sin persistencia): refresh de página cierra sesión.
   Se deja igual.
7. Copy: español neutro (tuteo). Eliminar el voseo en todo el frontend.
8. Contraste WCAG AA estricto: 4.5:1 texto, 3:1 bordes de controles y glifos.
9. STATUS.md se limpia: dejar solo "Dev 1 — refactor FE" (hecho).
10. El dueño rediseña también las pantallas nuevas de los demás devs: la base
    debe cubrir listados, fichas, formularios, gráficos, filtros.
11. Única dependencia nueva aprobada: @fontsource (ibm-plex-sans,
    ibm-plex-mono, source-serif-4), subconjuntos latin + latin-ext.
12. Sin Vitest ni tests frontend: verificación = `npm run build` +
    checklist manual por pantalla.

## 3. Dirección visual: "Bitácora técnica"

Fuente de verdad visual: **`frontend/src/styles/tokens.css`** (prohibido hex
hardcodeado fuera de ese archivo). Resumen de restricciones (todas
obligatorias):
- Radios: 4px controles, 6px paneles. Nunca > 8px.
- Sin sombras decorativas (solo overlays). Jerarquía con líneas de 1px y
  fondos tonales. Sin gradientes, glassmorphism, Emojis ni iconos en círculos
  de color. Sin tarjetas dentro de tarjetas.
- Secciones tipo "ficha": título de sección a la izquierda, contenido a la
  derecha, separadas por reglas horizontales (1 columna en móvil).
- PageHeader: título + una línea de metadatos opcional + acciones. SIN eyebrow
  ni breadcrumb duplicado.
- Tablas densas: cabecera sin fondo en versalitas pequeñas, filas ~44px,
  IDs/códigos/fechas en mono con `tabular-nums`. Una acción primaria como
  enlace de texto por fila; secundarias en menú de fila accesible
  ("Más acciones", navegable por teclado, Esc cierra).
- Estados (incidencias/reservas) = glifo de forma distinta + texto, colores
  atenuados desde tokens. Nunca solo color.
- Sidebar: ítem activo con línea de 2px a la izquierda + peso 600; sin
  píldora ni punto. Icono distinto por ítem (hoy Perfil y Reservas comparten
  en `Icon.jsx` — corregir).
- Timeline "bitácora" para historiales/auditoría (línea vertical fina, marcas
  de tiempo en mono, estado y autor).
- Movimiento: solo transiciones color/opacidad 120–160ms; respetar
  `prefers-reduced-motion`; sin animaciones de entrada.
- Microcopy concreto y sobrio.

## 4. Reglas de ejecución

- SE PUEDE: leer todo el repo; crear/editar código en `frontend/` según el
  checkpoint en curso; `STATUS.md` (raíz) es la única excepción fuera de
  `frontend/`; `docs/plan-refactor-frontend.md` y `frontend/AGENTS.md`
  autorizados explícitamente.
- PROHIBIDO ejecutar: git (add/commit/push/pull/checkout/switch/stash/reset/
  merge), npm (install/ci/uninstall/run), node, o cualquier comando que
  modifique repo/dependencias/entorno. Solo lectura (ls, cat, grep, git
  status/diff/log).
- PROHIBIDO modificar: `package.json`, `package-lock.json`, `.gitignore`,
  `opencode.json`, `.env`, `backend/`, `database/`. Si algo requiere cambios
  ahí: indicarlo exactamente y el dueño lo aplica.
- Todo comando (instalar, compilar, correr scripts, commitear) se entrega ya
  escrito, listo para copiar/pegar en **PowerShell**, en orden exacto.
- Trabajo por CHECKPOINTS pequeños. No avanzar al siguiente hasta que el dueño
  responda "ok CPn".
- No cambiar contratos de API ni backend; reportar lo que los requiera.
- No migrar pantallas en Fase 1 salvo lo mínimo para que el shell nuevo
  funcione.

## 5. Formato obligatorio del reporte al cerrar CADA checkpoint

1. Archivos creados / modificados / eliminados (ruta + una línea de qué hace).
2. Comandos para el dueño, en bloque único y en orden (instalación si aplica,
   build, script de contraste si aplica, cómo levantar el proyecto).
3. Checklist manual con casillas `- [ ]`: pantalla/ruta a abrir, acción y
   resultado esperado; tamaños 375px / 768px / 1280px si hay UI; navegación
   por teclado (Tab/Enter/Esc); qué funcionalidad existente podría haberse
   roto y cómo comprobarlo.
4. Riesgos y decisiones pendientes (o "ninguno").
5. Commit sugerido: mensaje convencional + comandos git para que el DUEÑO los
   ejecute; aclarar si conviene commitear ya o esperar.
6. Pregunta final: "¿ok CPn para continuar con CP(n+1)?"

## 6. Checkpoints de la Fase 1 (estado actual)

| CP | Contenido | Estado |
|---|---|---|
| CP1 | `styles/tokens.css` + `styles/base.css` + fuentes (imports) + `scripts/check-contrast.mjs` | **Implementado.** `npm install` (3 @fontsource) y `npm run build` OK por el dueño. check-contrast fallaba por bug de nombres de token ("----ink") — corregido; **pendiente re-ejecutarlo**. Fuentes cambiadas a subconjuntos latin/latin-ext. STATUS.md limpio. |
| CP2 | Hooks: `useQuery`, `useMutation`, `useConfirm`, `useHashRoute` | Sin iniciar |
| CP3 | UI básicos: Button, Alert, Toast (aria-live), StatusBadge (glifo+texto), Field/Input/Select/Textarea/Checkbox (error por campo, aria-invalid/aria-describedby), SearchInput, EmptyState, ErrorState, Spinner/Skeleton, PageHeader | Sin iniciar |
| CP4 | UI compuestos: Section (ficha), DefinitionList, Timeline, RowActionsMenu, Modal ampliado (footer, backdrop opt-in, foco atrapado/devuelto, Esc), ConfirmDialog (reemplaza los 6 window.confirm al migrar), DataTable (caption oculta, th scope, tarjetas apiladas <640px, estados integrados), FilterBar, Pagination | Sin iniciar |
| CP5 | Router por hash + config declarativa de roles/menú + AppShell nuevo (sidebar con `inert` en drawer cerrado) | Sin iniciar |
| CP6 | Página `#/ui` (solo `import.meta.env.DEV`, guía visual viva) + `validations/` (reglas leídas de los schemas reales del backend, solo lectura) + `api.js` conservando estructura `errors: campo→mensajes` en el objeto de error | Sin iniciar |

Condiciones: cada checkpoint debe dejar el proyecto compilando y funcionando
igual que antes (coexistencia controlada; CSS viejo solo se borra si es dead
code confirmado / al final).

## 7. Plan de migración posterior a la Fase 1 (orden vigente)

1. `refactor:` SpecialtiesPage, BuildingsPage, UnitsPage → CrudPage + ui (CRUD puro, riesgo bajo).
2. `refactor:` ManagementPage + ResidentsPage + CreateAccount (+ `validations/`, relación residentes-unidades).
3. `refactor:` EspaciosPage / SpacePolicies (subvistas y relaciones).
4. `refactor:` MisReservas / GestionReservas / CreateReservation — **coordinar con Dev 4 antes** (riesgo alto).
5. `refactor:` IncidentsPage → subcomponentes (tabla, form de creación, modal de detalle, timeline) — **antes que reservas**, habilita a Dev 2 (insumos en intervenciones).
6. `refactor:` Profiles: split historiales (ResidentHome → Perfil = solo datos+unidades; historiales a pantallas propias "Mis incidencias"/"Mis reservas"; EmployeeProfile → datos + especialidades).
7. `feat:` navegación por hash + grupos por rol + AppShell final.
8. `style:` pasada responsive + a11y (contraste, aria-invalid, dialog/inert).
9. `chore:` borrar dead code + CSS viejo + `docs/convenciones-frontend.md` + `frontend/AGENTS.md` completo + limpieza final de STATUS.md.

(En Fase 1 el anillo base CP5/CP6 puede adelantar partes de 7; los pasos
finales de AppShell/navegación se consolidan aquí.)

## 8. Pendientes abiertos

- [ ] Ejecutar `check-contrast` tras el fix (dueño) y pegar la tabla → validar
      pares con tinte agregados (12 nuevos: ink-2/ink-3 sobre los 6 bg de estado).
- [ ] Confirmar contraste de los pares nuevos con tinte (esperado ≥4.5:1 con
      `--ink-3 #5f6964`; restaurantes mínimos: ~4.6 sobre neutral/danger).
- [ ] `npm audit` (Solo lectura, dueño): identificar paquete origen de la
      vulnerabilidad high reportada; NO ejecutar `npm audit fix` sin revisar.
- [ ] Commit CP1 pendiente: solo con check-contrast en exit 0.
- [ ] CP2–CP6 (ver tabla de estado).
- [ ] Al crear `validations/` (CP6): **leer los schemas del backend**
      (marshmallow/pydantic o equivalentes en `backend/`, solo lectura) para no
      asumir reglas. Pendiente de confirmar: minLength password real del backend
      (front usa 8 chars y 72 bytes), máximos por campo del backend.
- [ ] Pendiente de confirmar: icono específico para "Perfil" y "Reservas" en
      `Icon.jsx` (hoy comparten paths) — decidirse en CP5.
- [ ] Fuente de datos del historial de incidencias del residente/técnico: el
      front usa GET `/incidents` (backend filtra por usuario; suposición no
      verificada contra el backend).
