/* F2-1b — Modo "ui" de CrudPage (activado solo con variant="ui").
 * Paridad con el modo legado para los mismos contratos de props:
 * carga (useQuery con signal), búsqueda (mismo criterio: columnas
 * declaradas, insensible a mayúsculas), crear/editar/eliminar (mismos
 * endpoints y payloads: trim de strings, nullable → null, multiselect y
 * select/number → Number, checkbox → boolean, password omitida si vacía al
 * editar y tope de 72 bytes), validaciones y mensajes del legado, permisos
 * canCreate/canEdit/canDelete/canEditRow/isFieldDisabled, lookups,
 * getRecordLabel y renderExtraActions. Defaults: updateMethod="PATCH".
 * Diferencias por convención (plan §2.18): error de la acción DENTRO del
 * FormModal, éxito por Toast, eliminación con useConfirm (danger) y carga
 * con Skeleton sin parpadeo de "Reintentar" (cierra B9).
 * Aditivo de la ronda 1 (F2-1b): acciones de fila como botones visibles
 * vía RowActions (Editar quiet sm + Eliminar danger-ghost sm, patrón de
 * Mis reservas, sin menú) y labels opcionales createLabel/editLabel para
 * el botón de crear y los títulos de los modales.
 * Aditivo F2-6a: prop opcional `schema` (objeto de validations/ que espeja
 * al backend) para validar en cliente en crear/editar; sin `schema` el
 * comportamiento es IDÉNTICO al anterior (incluido `especialidadCrear`
 * por endpoint, solo para /specialties). Aditivo F2-6a (extras de
 * sesión): field type "checks" (grupo de Checkbox del kit, para
 * especialidad_ids como checkboxes del catálogo; aditivo, sin tocar los
 * tipos existentes) con props opcionales onlyActive y emptyMessage, y
 * cuerpo del grupo tratado igual que multiselect (array → números).
 * Aditivo F2-6a: prop opcional `reloadSignal` (número); al cambiar,
 * `reload()` con datos previos conservados (la lista no titila a vacío).
 * Necesario para pantallas con acciones de fila MANEJADAS por la pantalla
 * (p. ej. Activar/Desactivar el acceso de una cuenta), que no pasan por
 * las mutaciones internas de este componente. Default undefined → sin
 * efecto; ningún consumidor actual lo pasa. */
import { useEffect, useRef, useId, useMemo, useState } from "react";
import { api } from "../services/api";
import { routes } from "../services/routes";
import { useMutation } from "../hooks/useMutation";
import { useQuery } from "../hooks/useQuery";
import { useConfirm } from "../hooks/useConfirm";
import { validate, especialidadCrear } from "../validations";
import {
  Button,
  Checkbox,
  DataTable,
  Field,
  FilterBar,
  FormModal,
  Input,
  PageHeader,
  RowActions,
  SearchInput,
  Select,
  Textarea,
  useFormFieldError,
  useToast,
} from "./ui";

const EMPTY_LOOKUPS = [];
const always = () => true;
const never = () => false;

function emptyForm(fields) {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === "checkbox"
        ? true
        : field.type === "multiselect" || field.type === "checks"
          ? []
          : "",
    ])
  );
}

function normalizarErrores(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensajes]) => [
      campo,
      Array.isArray(mensajes) ? (mensajes[0] ?? "") : String(mensajes),
    ])
  );
}

function CampoCrud({
  field,
  valor,
  alCambiar,
  deshabilitado,
  opciones,
  ayuda,
  asteriscoRequerido,
  esEdicion,
}) {
  const error = useFormFieldError(field.name);
  const grupoId = useId();

  if (field.type === "checkbox") {
    return (
      <Checkbox
        label={field.label}
        name={field.name}
        autoComplete="off"
        checked={Boolean(valor)}
        disabled={deshabilitado}
        onChange={(event) => alCambiar(event.target.checked)}
      />
    );
  }

  /* Aditivo F2-6a: GRUPO de checkboxes (uno por opción del lookup; ronda 1:
   * casilla a la IZQUIERDA y etiqueta a su derecha — .ui-checkbox ya las
   * ordena así), cabecera con clase existente (ui-field-label) y el bloque
   * de ayuda + error DEBAJO del grupo, conectados por aria-describedby y
   * con aria-invalid en cada casilla. Sin Field (todas las casillas
   * compartirían id) ni Section (h2). */
  if (field.type === "checks") {
    const visibles = field.onlyActive
      ? opciones.filter((option) => Boolean(option.activo))
      : opciones;
    const helpId = `${grupoId}-help`;
    const errorId = `${grupoId}-error`;
    /* Sin opciones visibles (lookup vacío o todo inactivo) el texto de
     * ayuda lo explica; con opciones, la ayuda declarada en la pantalla. */
    const textoAyuda =
      visibles.length === 0
        ? field.emptyMessage ?? "No hay opciones disponibles."
        : ayuda;
    const descritos = [textoAyuda ? helpId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div>
        <p className="ui-field-label" id={`${grupoId}-label`}>
          {field.label}
          {asteriscoRequerido && (
            <>
              <span className="ui-field-required" aria-hidden="true">
                {" *"}
              </span>
              <span className="ui-visually-hidden"> (obligatorio)</span>
            </>
          )}
        </p>
        <div
          role="group"
          aria-labelledby={`${grupoId}-label`}
          aria-describedby={descritos}
          style={{ display: "grid", gap: "var(--space-2)" }}
        >
          {visibles.map((option) => (
            <Checkbox
              key={option[field.optionId]}
              label={option[field.optionLabel || "nombre"]}
              name={field.name}
              autoComplete="off"
              disabled={deshabilitado}
              checked={Array.isArray(valor) && valor.includes(option[field.optionId])}
              aria-invalid={error ? true : undefined}
              aria-describedby={descritos}
              onChange={(event) => {
                const id = option[field.optionId];
                alCambiar(
                  event.target.checked
                    ? Array.isArray(valor) ? [...valor, id] : [id]
                    : (Array.isArray(valor) ? valor : []).filter(
                        (item) => item !== id
                      )
                );
              }}
            />
          ))}
        </div>
        {textoAyuda && (
          <p className="ui-field-help" id={helpId}>
            {textoAyuda}
          </p>
        )}
        {error && (
          <p className="ui-field-error" id={errorId}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <Field
      label={field.label}
      required={asteriscoRequerido}
      error={error}
      help={ayuda}
    >
      {field.type === "select" || field.type === "multiselect" ? (
        <Select
          name={field.name}
          autoComplete="off"
          multiple={field.type === "multiselect"}
          disabled={deshabilitado}
          value={valor}
          onChange={(event) =>
            alCambiar(
              field.type === "multiselect"
                ? Array.from(
                    event.target.selectedOptions,
                    (option) => option.value
                  )
                : event.target.value
            )
          }
        >
          {field.type !== "multiselect" && <option value="">Seleccionar...</option>}
          {opciones.map((option) => (
            <option key={option[field.optionId]} value={option[field.optionId]}>
              {option[field.optionLabel || "nombre"]}
            </option>
          ))}
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea
          name={field.name}
          autoComplete="off"
          disabled={deshabilitado}
          maxLength={field.maxLength}
          rows={3}
          value={valor}
          onChange={(event) => alCambiar(event.target.value)}
        />
      ) : (
        <Input
          name={field.name}
          type={field.type || "text"}
          autoComplete={field.type === "password" ? "new-password" : "off"}
          disabled={deshabilitado}
          min={field.min}
          max={field.max}
          step={field.step}
          maxLength={field.maxLength}
          placeholder={
            field.type === "password" && esEdicion
              ? "Vacío para conservar la contraseña"
              : undefined
          }
          value={valor}
          onChange={(event) => alCambiar(event.target.value)}
        />
      )}
    </Field>
  );
}

export default function CrudPageUi({
  title,
  description = "Administra los registros del condominio.",
  endpoint,
  updateMethod = "PATCH",
  idField,
  fields = [],
  columns,
  lookups = EMPTY_LOOKUPS,
  renderExtraActions,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canEditRow = always,
  isFieldDisabled = never,
  getRecordLabel,
  createLabel,
  editLabel,
  schema,
  reloadSignal,
}) {
  const { data, loading, error, reload } = useQuery(
    async (signal) => {
      const resultados = await Promise.all([
        api(endpoint, { signal }),
        ...lookups.map((lookup) => api(lookup.endpoint, { signal })),
      ]);
      return resultados.map((resultado) => resultado ?? []);
    },
    [endpoint, lookups]
  );

  /* Aditivo F2-6a: señal de refresco externo (acciones de fila de la
   * pantalla asentadas fuera de este componente). Con `reload()` el
   * listado anterior se conserva mientras re-consulta. */
  const primeraSenal = useRef(reloadSignal);
  useEffect(() => {
    if (reloadSignal === undefined || reloadSignal === primeraSenal.current) return;
    primeraSenal.current = reloadSignal;
    if (!error) reload();
  }, [reloadSignal, error, reload]);
  const [rows = []] = data || [];
  const options = useMemo(
    () =>
      Object.fromEntries(
        lookups.map((lookup, index) => [lookup.name, data?.[index + 1] ?? []])
      ),
    [lookups, data]
  );

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(() => emptyForm(fields));
  const [editingId, setEditingId] = useState(null);
  const [accionError, setAccionError] = useState("");
  const [fieldErrors, setFieldErrors] = useState(null);
  const editingRow = rows.find((row) => row[idField] === editingId);

  const notify = useToast();
  const confirm = useConfirm();

  const guardar = useMutation(({ id, body }) =>
    api(id === null ? endpoint : `${endpoint}/${id}`, {
      method: id === null ? "POST" : updateMethod,
      body,
    })
  );
  const eliminar = useMutation((id) =>
    api(`${endpoint}/${id}`, { method: "DELETE" })
  );

  const busy = guardar.busy || eliminar.busy;

  /* Schema de cliente (aditivo F2-6a): el prop `schema` tiene prioridad;
   * sin prop, se conserva el comportamiento anterior (solo /specialties
   * valida con `especialidadCrear` — Edificios/Unidades/Especialidades no
   * pasan la prop y quedan idénticas). */
  const schemaActivo = schema ?? (endpoint === routes.specialties ? especialidadCrear : null);

  const filtered = rows.filter((row) =>
    columns.some((column) =>
      String(row[column.name] ?? "")
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    )
  );

  const sinCoincidencia = !loading && !error && rows.length > 0 && filtered.length === 0;

  function limpiarMensaje() {
    setAccionError("");
    setFieldErrors(null);
  }

  function abrirCrear() {
    if (busy || !canCreate) return;
    setEditingId(null);
    setForm(emptyForm(fields));
    limpiarMensaje();
    setOpen(true);
  }

  function editar(row) {
    if (busy || !canEdit || !canEditRow(row)) return;
    setEditingId(row[idField]);
    setForm(
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          field.type === "password"
            ? ""
            : row[field.name] ??
              (field.type === "multiselect" || field.type === "checks"
                ? []
                : ""),
        ])
      )
    );
    limpiarMensaje();
    setOpen(true);
  }

  function cerrarModal() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm(fields));
    limpiarMensaje();
  }

  function construirBody() {
    const body = {};

    for (const field of fields) {
      if (isFieldDisabled(field, editingRow)) continue;
      let value = form[field.name];

      if (field.type === "password" && editingId !== null && !value) {
        continue;
      }

      if (field.type !== "password" && typeof value === "string") {
        value = value.trim();
      }

      if (
        field.required &&
        field.type !== "checkbox" &&
        !(field.type === "password" && editingId !== null) &&
        (value === "" || (Array.isArray(value) && value.length === 0))
      ) {
        return { error: `Completa el campo ${field.label}` };
      }

      if (field.type === "password" && value) {
        if (value.length < 8) {
          return { error: "Debe tener al menos 8 caracteres." };
        }
        if (new TextEncoder().encode(value).length > 72) {
          return { error: "La contraseña no puede superar 72 bytes." };
        }
      }

      if (field.nullable && value === "") {
        value = null;
      } else if (field.type === "multiselect" || field.type === "checks") {
        value = value.map(Number);
      } else if (field.type === "select" || field.type === "number") {
        value = Number(value);
      }

      body[field.name] = value;
    }

    return { body };
  }

  async function save(event) {
    event.preventDefault();
    if (guardar.busy) return;
    if (editingId === null ? !canCreate : !canEdit) return;
    if (editingId !== null && (!editingRow || !canEditRow(editingRow))) return;

    setAccionError("");
    setFieldErrors(null);

    if (schemaActivo) {
      const errores = validate(form, schemaActivo);
      if (Object.keys(errores).length > 0) {
        setFieldErrors(errores);
        return;
      }
    }

    const { body, error: errorValidacion } = construirBody();
    if (errorValidacion) {
      setAccionError(errorValidacion);
      return;
    }

    try {
      await guardar.run({ id: editingId, body });
      cerrarModal();
      notify("Cambios guardados.");
      reload();
    } catch (err) {
      setAccionError(err.message);
      if (err?.errors) setFieldErrors(normalizarErrores(err.errors));
    }
  }

  async function pedirEliminar(row) {
    if (busy || !canDelete) return;
    const si = await confirm({
      title: "Eliminar registro",
      message: `Se eliminará "${
        getRecordLabel?.(row) || `#${row[idField]}`
      }". No hay vuelta atrás.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!si) return;

    try {
      await eliminar.run(row[idField]);
      if (editingId === row[idField]) cerrarModal();
      notify("Registro eliminado.");
      reload();
    } catch (err) {
      notify(err.message || "No se pudo eliminar el registro.", { tone: "danger" });
    }
  }

  const triggerNuevo = canCreate ? (
    <Button onClick={abrirCrear} disabled={busy || loading}>
      {createLabel ?? "Nuevo registro"}
    </Button>
  ) : null;

  const celda = (dato) => {
    if (typeof dato === "boolean") return dato ? "Sí" : "No";
    return dato ?? "—";
  };

  const showActions = canEdit || canDelete || Boolean(renderExtraActions);

  const columnasTabla = [
    ...columns.map((column) => ({
      key: column.name,
      header: column.label,
      render: column.render ?? ((row) => celda(row[column.name])),
      cellClassName: column.cellClassName,
    })),
    ...(showActions
      ? [
          {
            key: "acciones",
            header: "Acciones",
            width: "calc(var(--space-12) * 4)",
            render: (row) => {
              const etiqueta = getRecordLabel?.(row) || `registro #${row[idField]}`;
              return (
                <RowActions
                  actions={[
                    ...(canEdit && canEditRow(row)
                      ? [{
                          label: "Editar",
                          ariaLabel: `Editar ${etiqueta}`,
                          onSelect: () => editar(row),
                        }]
                      : []),
                    ...(canDelete
                      ? [{
                          label: "Eliminar",
                          danger: true,
                          disabled: eliminar.busy,
                          ariaLabel: `Eliminar ${etiqueta}`,
                          onSelect: () => pedirEliminar(row),
                        }]
                      : []),
                  ]}
                >
                  {renderExtraActions?.(row, busy)}
                </RowActions>
              );
            },
          },
        ]
      : []),
  ];

  const ayudaDeCampo = (field) => {
    const partes = [];
    if (field.help) partes.push(field.help);
    if (field.lookup && !loading && !options[field.lookup]?.length) {
      partes.push(field.emptyMessage || "No hay opciones disponibles.");
    }
    return partes.length > 0 ? partes.join(" ") : undefined;
  };

  const conteo = loading
    ? undefined
    : `${filtered.length} registro${filtered.length === 1 ? "" : "s"}`;
  const meta = [description, conteo].filter(Boolean).join(" · ") || undefined;

  return (
    <section>
      <PageHeader
        title={title}
        meta={meta}
        actions={!loading && rows.length === 0 ? null : triggerNuevo}
      />

      <FilterBar>
        <SearchInput
          label={`Buscar en ${title.toLowerCase()}`}
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
          placeholder="Buscar registros..."
        />
        <Button variant="quiet" disabled={busy || loading} onClick={reload}>
          Actualizar
        </Button>
      </FilterBar>

      {open && (
        <FormModal
          title={
            editingId === null
              ? (createLabel ?? `Crear · ${title}`)
              : (editLabel ?? `Editar · ${title}`)
          }
          description={
            editingRow
              ? `Registro: ${getRecordLabel?.(editingRow) || `#${editingId}`}`
              : undefined
          }
          open
          busy={guardar.busy}
          error={accionError || undefined}
          fieldErrors={fieldErrors}
          showRequiredNote={fields.some((field) => field.required)}
          onSubmit={save}
          onClose={cerrarModal}
        >
          {fields.map((field) => (
            <CampoCrud
              key={field.name}
              field={field}
              valor={form[field.name]}
              alCambiar={(valor) => setForm({ ...form, [field.name]: valor })}
              deshabilitado={busy || isFieldDisabled(field, editingRow)}
              opciones={options[field.lookup] ?? []}
              ayuda={ayudaDeCampo(field)}
              asteriscoRequerido={
                field.required &&
                !(field.type === "password" && editingId !== null)
              }
              esEdicion={editingId !== null}
            />
          ))}
        </FormModal>
      )}

      <DataTable
        columns={columnasTabla}
        rows={filtered}
        rowKey={(row) => row[idField]}
        caption={`Listado de ${title.toLowerCase()}`}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={sinCoincidencia ? "No hay registros que coincidan." : "No hay registros"}
        emptyDescription={sinCoincidencia ? "Ajusta la búsqueda para ver resultados." : "Aún no agregaste ningún registro."}
        emptyAction={canCreate && !sinCoincidencia ? triggerNuevo : undefined}
      />
    </section>
  );
}
