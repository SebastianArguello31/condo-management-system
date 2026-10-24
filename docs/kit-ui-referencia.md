# Referencia del kit UI (Dev 1 — refactor FE)

Fuente de esta guía: el CÓDIGO REAL de `frontend/src` leído el 2026-10-24
(`components/ui/*.jsx`, `hooks/*.js(x)`, `validations/*`, `utils/*`,
`services/*`, `config/routing.js`). Nada aquí está inventado: si algo no
está en el código, no aparece. Si cambias el kit, actualiza esta guía.

Complementos: `docs/plan-refactor-frontend.md` (convenciones §2–§7) y
`docs/convenciones-frontend.md` (reglas por pantalla).

## 0. Convenciones de import

```js
import { Button, DataTable, FormModal, useFormFieldError } from "../components/ui";
import { useConfirm } from "../hooks";              // barrel de hooks
import { useConfirmResponder } from "../hooks/useConfirm"; // solo ConfirmDialog
import { useHashRoute } from "../hooks/useHashRoute";
import { validate, especialidadCrear } from "../validations";
import { downloadAttachment } from "../utils/downloadAttachment";
import { formatDate, formatTime, formatDateTime } from "../utils/format";
import { api } from "../services/api";
import { routes } from "../services/routes";
import Icon from "../components/ui/Icon";
```

Providers YA montados una vez en `App.jsx`: `ToastProvider`,
`ConfirmProvider`, `<ConfirmDialog />` (no volver a montarlos por pantalla).

Estilos: los componentes ui importan `./ui.css`; NO agregar CSS para el kit
fuera de `ui.css` y de `styles/tokens.css` (los estilos nuevos solo
consumen tokens; hex/px hardcodeados prohibidos fuera de tokens.css).

---

## 1. Componentes (`components/ui/`)

### Button — `components/ui/Button.jsx`

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `variant` | `"primary" \| "quiet" \| "danger" \| "link"` | no | `"primary"` | `link` (F2-3): texto sin borde/fondo, alto de fila |
| `size` | `"md" \| "sm"` | no | `"md"` | `sm` compacto (alto de fila) |
| `busy` | boolean | no | `false` | deshabilita + spinner inline + `aria-busy` |
| `block` | boolean | no | `false` | ancho completo |
| `type` | string | no | `"button"` | pasar `"submit"` en `<form>` |
| `disabled` | boolean | no | `false` | |
| `className` | string | no | `""` | |
| `children` | node | sí | — | texto/ícono |
| ref | `forwardRef` | — | — | acepta ref |
| `...rest` | props nativas | no | — | pasadas al `<button>` |

```jsx
<Button variant="quiet" onClick={cerrar}>Cancelar</Button>
<Button variant="link" size="sm" onClick={verDetalle}>Detalle</Button>
<Button type="submit" busy={busy}>Guardar</Button>
```

Accesibilidad: `aria-busy={busy}`; spinner `aria-hidden`; mismo `span` de
texto siempre (para `variant="link"` el foco/anillo visible lo da ui.css).

### Alert — `components/ui/Alert.jsx`

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `tone` | `"neutral" \| "muted" \| "info" \| "success" \| "warning" \| "danger"` | no | `"neutral"` | |
| `visible` | boolean | no | `true` | controlado por el PADRE; `false` → `null` |
| `title` | string | no | — | línea fuerte |
| `onDismiss` | función | no | — | si viene, botón × |
| `children` | node | no | — | cuerpo del aviso |
| `className` | string | no | `""` | |

```jsx
<Alert tone="danger" visible={!!error} title="No se pudo completar la acción">
  {error}
</Alert>
```

Accesibilidad: CONTROLADO (sin estado interno): visibilidad la maneja el
padre. `tone="danger"` renderiza `role="alert"`; resto `role="status"`.
Botón × con `aria-label="Cerrar aviso"`.

### Toast — `components/ui/Toast.jsx` (`ToastProvider`, `useToast`)

`ToastProvider` toma solo `children`. `useToast()` devuelve `show(message, { tone = "neutral", timeout = 4000 })`.

```jsx
const notify = useToast();
// tras éxito de una mutación:
notify("La reserva se canceló.", { tone: "neutral" });
// error fuera de un modal:
notify(er.message, { tone: "danger" });
```

Accesibilidad: región general `role="status" aria-live="polite"`; los toasts
de `tone="danger"` van a una REGION APARTE `aria-live="assertive"`; cierre
manual con × (aria-label "Cerrar aviso"). Convención §2.18 del plan: éxito
de acciones de modal → Toast del padre; error de acción de modal → Alert

### StatusBadge — `components/ui/StatusBadge.jsx`

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `estado` | string | sí | — | estado del backend; normaliza `_`/espacios → guion |
| `tone` | tono (ídem Alert) | no | preset | override |
| `glyph` | `"dot" \| "ring" \| "square" \| "diamond" \| "triangle" \| "check"` | no | preset | override |
| `className` | string | no | `""` | |

Presets (estados REALES; demasiado temprano para pintarla manualmente):
`recibida` info/ring · `en-revision` info/ring · `asignada` info/dot ·
`en-proceso` warning/triangle · `en-espera` warning/ring · `pendiente`
warning/ring · `confirmada` success/square · `resuelta` success/square ·
`rechazada` danger/diamond · `cancelada` muted/dot · `cerrada` neutral/dot ·
`finalizada` info/check. Estados fuera de la lista → neutral/dot.

```jsx
<StatusBadge estado={row.estado} />
<StatusBadge estado="EN_PROCESO" />  {/* "EN PROCESO", warning/triangle */}
```

Accesibilidad: glifo `aria-hidden` + texto con el estado (nunca solo color);
también exporta `STATUS_PRESETS` y `normalizeStatus`.

### Field — `components/ui/Field.jsx` (`Field`, `useFieldControlProps`)

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `label` | string | sí | — | `<label htmlFor>` |
| `required` | boolean | no | `false` | asterisco visual + "(obligatorio)" oculto |
| `error` | string | no | — | error de campo |
| `help` | string | no | — | ayuda bajo el control |
| `children` | node | sí | — | UN control (Input/Select/Textarea/Checkbox) |
| `className` | string | no | `""` | |

```jsx
const errorEmail = useFormFieldError("email");   // dentro de <FormModal>
<Field label="Correo" required error={errorEmail} help="Se usa para avisos.">
  <Input name="email" type="email" autoComplete="email" />
</Field>
```

Accesibilidad: reparte al control hijo por contexto: `id`, `aria-describedby`
(help + error) y `aria-invalid` (cuando hay error). Asterisco aria-hidden.

### Input / Select / Textarea — `components/ui/{Input,Select,Textarea}.jsx`

Props: TODAS las nativas de `<input>` / `<select>` / `<textarea>` + `className`.
`id`, `aria-invalid` y `aria-describedby` se resuelven solas DENTRO de
`<Field>` (fuera, se aceptan normales). `Select` recibe `children` `<option>`.

```jsx
<Field label="Prioridad" required>
  <Select name="id_prioridad">
    <option value="">Elegir…</option>
    {prioridades.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
  </Select>
</Field>
```

Nota (§2.19 del plan): SIEMPRE atributo `name`; `autoComplete="off"` en
cuenta de OTRA persona; `given-name`/`family-name`/`email`/`tel` en perfil
propio.

### Checkbox — `components/ui/Checkbox.jsx`

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `label` | string | sí | — | etiqueta a la derecha |
| resto | nativas de checkbox | — | — | |
| `className` | string | no | `""` | |

```jsx
<Checkbox label="Unidad activa" name="activo" checked={form.activo} onChange={...} />
```
Accesibilidad: el `label` real envuelve al input (en Field hereda id/aria).

### SearchInput — `components/ui/SearchInput.jsx`

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `value` | string | sí | — | controlado |
| `onChange` | fn(texto) | sí | — | |
| `onClear` | fn | no | — | botón "Borrar" y tecla Esc |
| `placeholder` | string | no | `"Buscar…"` | |
| `label` | string | no | `"Buscar"` | VISIBLE (alineación FilterBar K7) |
| `id`, `className`, `...rest` | — | no | — | |

```jsx
<SearchInput value={texto} onChange={setTexto} onClear={() => setTexto("")} />
```
Accesibilidad: label htmlFor; Esc limpia (stopPropagation), botón Borrar
aparece solo con contenido.

### EmptyState — `components/ui/EmptyState.jsx`

`title` (string, requerida), `description` (string, opcional), `action`
(node, opcional — típico `<Button variant="quiet">`), `className`.

```jsx
<EmptyState title="No hay registros" description="Aún no se creó ninguno."
  action={<Button variant="quiet" onClick={crear}>Crear el primero</Button>} />
```

### ErrorState — `components/ui/ErrorState.jsx`

`title` (string, defecto `"Surgió un problema"`), `description` (string,
opcional), `onRetry` (fn, opcional — renderiza `Button quiet` "Reintentar"),
`className`.

```jsx
<ErrorState description={er.message} onRetry={reload} />
```
Accesibilidad: `role="alert"` en el contenedor.

### Spinner / Skeleton — `components/ui/Loading.jsx`

`Spinner`: `label`(string, defecto `"Cargando…"`, texto oculto), `className`.
`Skeleton`: `lines` (number, defecto `3`), `className`; `aria-hidden`.
Ambos se congelan con `prefers-reduced-motion` (ui.css).

```jsx
{loading ? <Skeleton lines={6} /> : <Tabla … />}
```

### PageHeader — `components/ui/PageHeader.jsx`

`title` (requerida → `<h1>`), `meta` (string, UNA línea mono de metadatos),
`actions` (node a la derecha), `className`.

```jsx
<PageHeader title="Mis reservas"
  meta={`${rows.length} reservas · ${pendientes} pendientes`}
  actions={<Button onClick={nueva}>Nueva reserva</Button>} />
```
Accesibilidad: un único `h1` por página.

### Section — `components/ui/Section.jsx`

`title` (string → `<h2>`), `actions` (node en la cabecera), `children`,
`className`. Ficha: título/acciones a la izquierda, contenido a la derecha,
regla 1px; 1 columna <640px.

```jsx
<Section title="Datos del espacio" actions={<Button variant="link" size="sm">Ver detalle</Button>}>
  <DefinitionList items={items} columns={2} />
</Section>
```

### DefinitionList — `components/ui/DefinitionList.jsx`

`items` (REQUERIDA: `[{ term, detail? , children? }]` — pinta `detail` o
`children`), `columns` (`1` defecto | `2`), `className`. Valores mono con
`tabular-nums` donde corresponda (clase `ui-num` en el `detail`).

```jsx
<DefinitionList items={[
  { term: "Estado", detail: <StatusBadge estado={row.estado} /> },
  { term: "Fecha", detail: formatDate(row.fecha) },
]} />
```
Accesibilidad: `<dl>`/`<dt>`/`<dd>` nativos.

### Timeline — `components/ui/Timeline.jsx`

`entries` (REQUERIDA: `[{ id?, time, title, meta?, detail?, tone? }]`).
`tone` del marcador: `info | success | warning | danger | brand` o ninguno.

```jsx
<Timeline entries={historial.map((h) => ({
  time: formatDateTime(h.fecha), title: h.titulo, meta: h.estado,
  detail: h.detalle, tone: "info",
}))} />
```
Accesibilidad: `<ol>` ordenado; marcador `aria-hidden`; hora en mono.

### RowActionsMenu — `components/ui/RowActionsMenu.jsx` (patrón K6)

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `actions` | `[{ label, onSelect, disabled?, danger? }]` | no | `[]` | en vacío no muestra el disparador |
| `className` | string | no | `""` | |

```jsx
<RowActionsMenu actions={[
  { label: "Editar", onSelect: () => editar(row) },
  { label: "Eliminar", danger: true, onSelect: () => eliminar(row) },
]} />
```
Accesibilidad: disparador con tres puntos (`aria-label="Más acciones"`,
`aria-haspopup="menu"`, `aria-expanded`); flechas ↑↓ mueven, Home/End
extremos, Esc cierra y devuelve foco, Tab cierra, clic fuera cierra.
Patrón recomendado: UNA acción principal como enlace de texto (`Button
variant="link" size="sm"`) junto al menú; el resto AL menú.

### Modal — `components/ui/Modal.jsx`

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `title` | string | sí | — | `<h2>` del `<dialog>` |
| `description` | string | no | — | |
| `busy` | boolean | no | `false` | bloquea ×/Esc/click-fuera |
| `onClose` | fn | sí | — | |
| `footer` | node | no | — | fila de acciones |
| `backdrop` | boolean | no | `false` | clic fuera cierra (opt-in) |
| `labelledBy` | string | no | id interno | id forzable del título |
| `children` | node | sí | — | cuerpo |

```jsx
{abierto && (
  <Modal title="Detalle de la reserva" onClose={() => setAbierto(false)} footer={...}>
    <DefinitionList items={items} />
  </Modal>
)}
```
Accesibilidad: `<dialog>` nativo (foco atrapado y devuelto, Esc vía
`onCancel`); `aria-labelledby`. NOTA: se abre al MONTAR (`showModal` en
effect de mount) — controla la apertura con render condicional (`{abierto && …}`).
Usa las clases legacy `mg-modal`/`mg-icon-button` (aisladas, "coco" ui-modal).

### FormModal — `components/ui/FormModal.jsx` (`FormModal`, `useFormFieldError`)
Patrón §2.18/§2.20 del plan hecho componente.

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `title`, `description` | string | sí / no | — | ídem Modal |
| `open` | boolean | sí | — | `false` → `null` |
| `busy` | boolean | no | `false` | bloquea cierre y submit |
| `error` | string | no | — | error de la ACCIÓN → Alert danger DENTRO (foco + scroll) |
| `fieldErrors` | `{ campo: mensaje }` | no | `null` | errores por campo |
| `submitLabel` | string | no | `"Guardar"` | |
| `cancelLabel` | string | no | `"Cancelar"` | |
| `onSubmit` | fn(event) | sí | — | `<form noValidate>` |
| `onClose` | fn | sí | — | |
| `children` | node | sí | — | campos |

```jsx
const { run, busy, error, errors } = ...; // la mutación valida con err.errors
const [camposErr, setCamposErr] = useState(null);
<FormModal title="Nueva especialidad" open={abierto} busy={busy}
  error={errorAccion} fieldErrors={camposErr}
  onSubmit={guardar} onClose={() => setAbierto(false)}>
const errorNombre = useFormFieldError("nombre");
<Field label="Nombre" required error={errorNombre}>
  <Input name="nombre" autoComplete="off" value={form.nombre} onChange={...} />
</Field>
</FormModal>
```
`useFormFieldError(nombre)` (hook hijo): devuelve el mensaje de ese campo
desde `fieldErrors` o `undefined`. La validación y el mapeo de
`err.errors → fieldErrors` los hace la PANTALLA (con `validations/`).
Accesibilidad: error de la acción con `role="alert"`, foco y scroll al
aparecer; cierre bloqueado en `busy`; éxito SIEMPRE por Toast del padre.

### ConfirmDialog — `components/ui/ConfirmDialog.jsx`

Sin props: se monta UNA vez (ya montado en `App.jsx`) dentro de
`ConfirmProvider`; consume `useConfirmResponder`.

```jsx
const confirm = useConfirm();
const si = await confirm({
  title: "Eliminar especialidad",
  message: `Se eliminará "${row.nombre}". No hay vuelta atrás.`,
  danger: true,          // botón danger y foco en Cancelar
  confirmLabel: "Eliminar",
});
if (si) { ... }
```
Resuelve `true`/`false` (Esc/cancelar/click-fuera → `false`). Req: provider
arriba (si falta, `confirm()` resuelve `false` con aviso en consola en DEV).

### DataTable — `components/ui/DataTable.jsx`

| Prop | Tipo | Obligatoria | Defecto | Notas |
|---|---|---|---|---|
| `columns` | arranged | sí | — | { key, header, align?: "left"\|"right", width?: string (token/valor CSS), headerClassName?, cellClassName?, render?(fila) } |
| `rows` | array | no | `[]` | |
| `rowKey` | fn(fila) | no | `row.id` | clave estable por fila |
| `caption` | string | no | — | oculta visualmente; DESCRIBE la tabla |
| `loading` | boolean | no | `false` | → Skeleton (4–8 líneas) |
| `error` | Error \| string \| null | no | `null` | → ErrorState |
| `errorTitle` | string | no | `"No se pudieron cargar los datos"` | |
| `emptyTitle` | string | no | `"No hay registros"` | |
| `emptyDescription` | string | no | — | |
| `emptyAction` | node | no | — | acción de crear, típicamente |
| `onRetry` | fn | no | — | botón Reintentar del ErrorState |
| `className` | string | no | `""` | |

```jsx
<DataTable caption="Reservas del residente" columns={[
  { key: "espacio", header: "Espacio" },
  { key: "fecha", header: "Fecha", render: (r) => formatDate(r.fecha) },
  { key: "estado", header: "Estado", render: (r) => <StatusBadge estado={r.estado} /> },
  { key: "acciones", header: "Acciones", width: "calc(var(--space-12) * 3)" },
]} rows={rows} rowKey={(r) => r.id} loading={loading} error={error}
  emptyAction={<Button variant="quiet" onClick={nueva}>Nueva reserva</Button>} />
```
Accesibilidad/a11y: `caption` oculta, `th scope="col"`, fechas/montos en
celda con `align: "right"` (clase `ui-num`: tabular-nums); <640px cada fila
es tarjeta apilada con `data-label` de la cabecera. Marco cerrado
`.ui-table-shell`; `width` solo se usa para reservar ancho (p. ej. columna
Acciones alineada a la IZQUIERDA con slot reservado del menú) y el colgroup
no aplica en la pila móvil.

### FilterBar — `components/ui/FilterBar.jsx` (K7)

`onReset` (fn, opcional → "Limpiar filtros"), `children` (Fields y
SearchInput con etiquetas VISIBLES), `className`.

```jsx
<FilterBar onReset={limpiar}>
  <Field label="Estado"><Select name="estado">…</Select></Field>
  <SearchInput value={texto} onChange={setTexto} onClear={() => setTexto("")} />
</FilterBar>
```
Accesibilidad: alineación por la BASE del control; botones en esa línea.

### ErrorBoundary — `components/ui/ErrorBoundary.jsx`

Componente de CLASE: `children`, `resetKey` (cual; al CAMBIAR limpia el
error), `onVolverInicio` (fn). En `App.jsx` ya envuelve la pantalla activa
con `key={shown.path}` y `resetKey={shown.path}`.

```jsx
<ErrorBoundary resetKey={path} onVolverInicio={volverAlInicio}>
  <Page … />
</ErrorBoundary>
```
Accesibilidad/trazas: `console.error("[ErrorBoundary]", error, info)`; al
usuario solo ErrorState con "Volver al inicio" (título neutro).

### ErrorBoundary/Icon — `components/ui/Icon.jsx`

`Icon({ name, size = 20 })`: SVG `stroke="currentColor"`, `aria-hidden`
siempre (decorativo; el significado va en texto/aria-label del botón).

Nombres disponibles: `mail`, `lock`, `eye`, `eyeOff`, `users`, `residents`,
`employees`, `specialties`, `admins`, `buildings`, `units`, `incidents`,
`maintenance`, `profile`, `search`, `plus`, `close`, `edit`, `trash`,
`logout`, `menu`, `check`, `arrow`, `refresh`, `reservations`,
`reservationsGestion`, `espacios`, `residentHome`, `dots`, `dashboard`,
`chart`, `calendar`, `tool`, `box`, `clock`, `trendUp`, `alertTriangle`.
Nombre desconocido → `users` (fallback interno).

---

## 2. Hooks (`hooks/`)

### useHashRoute — `hooks/useHashRoute.js`

Sin argumentos → `{ path, params, navigate(path, params?, { replace? = false } = {}) }`.

Parseo: `#/ruta?k=v`; hash vacío, `"#"` o malformado (sin `/` inicial) →
`path: "/"`, `params: {}`; ruta y query se separan por la PRIMERA `?`;
`decodeURIComponent` siempre con try/catch (valor mal codificado queda
crudo); claves repetidas → array de strings. `replace: true` usa
`history.replaceState` (NO dispara `hashchange` nativo) y el hook lo
re-dispacha a mano — TODAS las instancias montadas se actualizan.

```jsx
const { path, params, navigate } = useHashRoute();
// URL: #/incidencias?estado=RECIBIDA&tag=a&tag=b
// path === "/incidencias"; params === { estado: "RECIBIDA", tag: ["a","b"] }
navigate("/mis-reservas", { estado: "PENDIENTE" });
navigate("/mis-reservas", null, { replace: true });
```
Notas: anclas internas (`#main-content`, sin `/`) NO son rutas — se conserva
la pantalla actual. Sirve en varios componentes simultáneos.

### useQuery — `hooks/useQuery.js`

`useQuery(fetcher, deps = [], { enabled = true } = {})` →
`{ data, loading, error, reload }`.

- `fetcher(signal)` — recibe el `signal` del AbortController.
- deps CAMBIAN → data DESCARTADA (undefined mientras carga: no mezclar
  listados); `reload()` re-consulta CONSERVANDO data previa (sin titilar).
- `enabled: false` → no consulta, aborta la en vuelo y queda
  `{ data: undefined, loading: false, error: null }`.
- En fallo CONSERVA data previa y expone `error`.
- Aborts al desmontar y ante respuestas de carreras (`signal.aborted`).

```jsx
const { data, loading, error, reload } = useQuery(
  (signal) => api(routes.reservations, { signal }), [user?.id]);
```

### useMutation — `hooks/useMutation.js`

`useMutation(mutationFn)` → `{ run(...args), busy, error, reset }`.

- dedupe: si hay una llamada en vuelo, `run` devuelve ESA promesa (1 solo
  envío real).
- En fallo: guarda `error` (objeto lanzado por `api()`; con validación del
  backend lleva `error.errors = { campo: [mensajes] }`) y RE-LANZA: captura
  en la pantalla con `try/catch`.

```jsx
const { run, busy, error } = useMutation((body) =>
  api(`${routes.specialties}`, { method: "POST", body }));
try {
  await run(form); notify("Especialidad creada.");
} catch (err) { setFieldsErrors(aCampos(err)); }  // err.errors = { campo: [msgs] }
```

### useConfirm — `hooks/useConfirm.jsx` (`ConfirmProvider`, `useConfirm`, `useConfirmResponder`)

- `ConfirmProvider({ children })`: montado UNA vez en `App.jsx` (+ `<ConfirmDialog />`).
- `useConfirm()` → `confirm({ title, description?, message, danger?, confirmLabel? })`
  → `Promise<boolean>` (true/false; Esc/fuera/cancelar → false).
- `useConfirmResponder()`: SOLO para conectar `ConfirmDialog`.

```jsx
const confirm = useConfirm();
if (!await confirm({ title: "Cancelar reserva", message: "¿Confirma cancelarla? No hay vuelta atrás.", danger: true })) return;
```

### Barrel `hooks/index.js`: re-exporta `useHashRoute`, `useQuery`,
`useMutation`, `ConfirmProvider`, `useConfirm`, `useConfirmResponder`.
(Barrel UI: `components/ui/index.js` — todos los componentes menos
`ErrorBoundary` e `Icon`, que se importan por archivo.)

---

## 3. Servicios y validaciones

### `services/api.js`

`api(path, { method = "GET", body, responseType = "json", signal })`:
inyecta `Authorization: Bearer` del token en memoria (`setAccessToken`).
Error → `Error` con el MESSAGE legado (`data.error || "Error HTTP n"` +
detalles `"campo: msg | …"`) y ADITIVAMENTE `err.status` y `err.errors`
(`{ campo: [mensajes] }` cuando el backend responde `{ error, errors }`, HTTP 400).
`responseType: "blob"` para binarios; 204 → `null`; 401 (fuera del login)
→ limpia token + evento `"session-expired"`.

```js
const lista = await api(routes.buildings, { signal });
await api(`${routes.buildings}/${id}`, { method: "PATCH", body: form });
```

### `services/routes.js`

`API_BASE = "/condominio"`; `routes` congelado con las rutas canónicas:
`auth, users, admins, employees, residents, specialties, buildings,
buildingTypes, units, unitTypes, incidents, reservations, commonSpaces,
maintenance, analytics`.

### `utils/downloadAttachment.js`

`downloadAttachment(id, filename)` — fijo: pide blob de
`/incidents/attachments/{id}` y dispara `<a download>`; revoca URL a
10 s. Importar DESDE `utils/`, no desde `services/api`.

### `utils/format.js` (NUEVO)

Fechas/horas en hora LOCAL del navegador: `formatDate` (DD/MM/AAAA),
`formatTime` (HH:MM), `formatDateTime` ("DD/MM/AAAA HH:MM"), `formatDateTime`
("DD/MM/AAAA HH:MM"); todos aceptan ISO string o `Date` y devuelven `""` si no hay dato válido.
Un string solo de fecha (`AAAA-MM-DD`) se construye en hora local para no
desplazar el día. Uso previsto: listados y detalles (F2-3 adopta, F2-4/F2-5 siguen).

```js
import { formatDate, formatDateTime } from "../utils/format";
formatDate("2026-03-05");           // "05/03/2026"
formatDateTime("2026-03-05T14:30"); // "05/03/2026 14:30"
```

### `validations/` (`validate.js`, `rules.js`, `schemas.js`)

`validate(form, schema) → { campo: mensaje }` — trim de strings (EXCEPTO
`password`, mirror del `pre_load` del backend), primer mensaje por campo,
campos ausentes → los marcan las reglas `requerido()`.

Reglas (`rules.js`): `requerido()`, `longitud(min, max)`, `maximo(max)`,
`correo()`, `contrasena()` (mensajes EXACTOS del backend:
"Debe tener al menos 8 caracteres" / "No puede superar 72 bytes"), `entero(min = 1)`,
`fecha()` (AAAA-MM-DD), `hora()` (HH:MM), `listaDeEnteros(min = 1)`.

Schemas ESPEJO de Marshmallow del backend (origen citado en comentario):
`cuenta`, `cuentaAdmin`, `cuentaResidente`, `cuentaEmpleado`, `login`
(password 1–200 aquí, SIN política), `perfilEmpleado` (email requerido),
`perfilResidente` (email opcional), `contrasenaNueva`, `incidenciaCrear`,
`incidenciaPrioridad`, `intervencionCrear`, `reservaCrear`,
`especialidadCrear`.

```jsx
const errores = validate(form, especialidadCrear);
setCamposErr(Object.fromEntries(Object.entries(errores).map(([c, [m]]) => [c, m])));
```
Ojo: `validate` devuelve UN mensaje por campo (string), mientras que
`err.errors` del backend trae ARRAYS por campo — normalizar antes de pasar
`fieldErrors` a `FormModal`.

---

## 4. Tokens (`styles/tokens.css`) — nombres por categoría

ÚNICA fuente de valores visuales. Prohibido hex/px hardcodeados fuera de
tokens.css (las líneas 1px/2px del kit son la excepción del plan).

- **Superficie:** `--bg`, `--surface`, `--line`, `--line-control`
- **Tinta:** `--ink`, `--ink-2`, `--ink-3`, `--on-brand`
- **Marca/acento:** `--brand`, `--brand-hover`, `--brand-pressed`,
  `--accent`, `--accent-hover`, `--accent-pressed`
- **Foco:** `--focus-ring`
- **Estados (pares fg/bg):** `--status-{neutral,info,warning,success,danger,muted}-{fg,bg}`
- **Gráficos:** `--chart-1` … `--chart-6`
- **Espaciado (escala 4):** `--space-1` … `--space-12`
- **Radios:** `--radius-sm` (4, controles), `--radius-md` (6, paneles),
  `--radius-lg` (8, reservado; nunca mayor)
- **Tipografía:** `--font-ui`, `--font-mono`, `--font-display` (solo
  títulos de página y cifras); tamaños `--fs-12/13/14/16/20/28/36` con sus
  líneas `--lh-12/13/14/16/20/28/36`
- **Componentes:** `--row-h` (44), `--control-h` (40), `--z-drawer` (40),
  `--z-modal` (50)
- **Movimiento:** `--motion-fast` (120 ms), `--motion` (160 ms; solo
  color/opacidad; `prefers-reduced-motion` apaga transiciones/spinner).

Breakpoints (convención, NO tokens): 640 / 900 / 1150 px. Excepción legada
marcada: drawer del shell en 760px hasta la limpieza final (F2-11).

---

## 5. Registro de una pantalla en `config/routing.js`

Única configuración declarativa (App/AppShell NO conocen claves de
módulos). Pasos:

1. **ITEMS**: agregar entrada `id: { path, label, icon, component, roles }`
   — `path` único (`"/pantalla"`), `component` el JSX importado arriba
   (lazy solo para rutas devOnly; las de producción van IMPORT estático),
   `roles` subset de `ADMIN | RESIDENTE | TECNICO`.
2. **GRUPOS**: agregar la `id` del ítem al grupo del rol correspondiente
   (`Personas` o `Comunidad`, en el orden deseado).
3. **CLAVE_PANTALLA** (opcional): SOLO si la pantalla es de otro dev y
   navega con la clave legada (`onNavigate("clave")`), mapear
   `clave → id` (las claves que ya coinciden con el id van por el
   fallback); `params` opcionales se serializan como query.
4. `navigationForRole`, `routeForPath`, `defaultRouteFor` y
   `rutaDesdeClavePantalla` siguen sin cambios (nada que registrar ahí).
5. Rojo SOLO DEV: `rutaSoloDev` (`#/ui`) es el único patrón lazy +
   `import.meta.env.DEV` — nunca fuera de esa rama.

Aterrizaje por rol (`RUTA_INICIAL`): ADMIN y TECNICO → `dashboard`;
RESIDENTE → `incidencias` (se toca SOLO con decisión del dueño).

```js
// 1) arriba: import MiPantalla from "../features/x/MiPantalla";
// 2) en ITEMS:
miPantalla: { path: "/mi-pantalla", label: "Mi pantalla",
  icono: "unidad", componente: MiPantalla, roles: [ADMIN, RESIDENTE] },
// 3) en GRUPOS: añadir "miPantalla" a los ítems del grupo del rol de elección
```
(Si la pantalla se agrega para TODOS los roles registrados, no hace falta
pasarla grupo por grupo: el ítem se filtra por `roles` en
`navigationForRole`.)

---

## 6. Prohibiciones vigentes (recordatorio)

- Sin hex/px sueltos: solo tokens (`styles/tokens.css`).
- Radios ≤ 8px; sin sombras decorativas (solo overlays), gradientes,
  glassmorphism, emojis ni tarjetas dentro de tarjetas.
- Transiciones solo color/opacidad 120–160 ms.
- Cambios a `components/ui` SIEMPRE retrocompatibles (props nuevas
  opcionales; nunca cambiar el significado/contrato de una prop).
- `window.confirm` prohibido en pantallas migradas → `useConfirm`.
- Errores/éxito de acciones de modal: error DENTRO del modal, éxito por
  Toast (§2.18).
