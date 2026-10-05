import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "./ui/Modal";
import Icon from "./ui/Icon";

const EMPTY_LOOKUPS = [];
const always = () => true;
const never = () => false;

function emptyForm(fields) {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === "checkbox" ? true : field.type === "multiselect" ? [] : "",
    ])
  );
}

export default function CrudPage({
  title,
  description = "Administra los registros del condominio.",
  endpoint,
  updateMethod = "PATCH",
  idField,
  fields,
  columns,
  lookups = EMPTY_LOOKUPS,
  renderExtraActions,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canEditRow = always,
  isFieldDisabled = never,
  getRecordLabel,
}) {
  const [rows, setRows] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState({});
  const [form, setForm] = useState(() => emptyForm(fields));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const editingRow = rows.find((row) => row[idField] === editingId);

  const load = useCallback(async (isActive = () => true) => {
    const results = await Promise.all([
      api(endpoint),
      ...lookups.map((lookup) => api(lookup.endpoint)),
    ]);

    if (!isActive()) return;
    setRows(results[0]);
    setOptions(
      Object.fromEntries(
        lookups.map((lookup, index) => [
          lookup.name,
          results[index + 1],
        ])
      )
    );
  }, [endpoint, lookups]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setReady(false);
    setError("");

    async function initialize() {
      try {
        await load(() => active);
        if (active) setReady(true);
      } catch (error) {
        if (active) setError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [load, reloadKey]);

  function resetForm() {
    setIsOpen(false);
    setEditingId(null);
    setForm(emptyForm(fields));
  }

  function edit(row) {
    if (!ready || busy || !canEdit || !canEditRow(row)) return;
    setError("");
    setNotice("");
    setEditingId(row[idField]);
    setIsOpen(true);

    setForm(
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          field.type === "password"
            ? ""
            : row[field.name] ?? (field.type === "multiselect" ? [] : ""),
        ])
      )
    );
  }

  async function save(event) {
    event.preventDefault();
    if (!ready || busy || (editingId === null ? !canCreate : !canEdit)) return;
    if (editingId !== null && (!editingRow || !canEditRow(editingRow))) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
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
          throw new Error(`Completa el campo ${field.label}`);
        }

        if (field.type === "password" && new TextEncoder().encode(value).length > 72) {
          throw new Error("La contraseña no puede superar 72 bytes.");
        }

        if (field.nullable && value === "") {
          value = null;
        } else if (field.type === "multiselect") {
          value = value.map(Number);
        } else if (field.type === "select" || field.type === "number") {
          value = Number(value);
        } else if (field.nullable && value === "") {
          value = null;
        }

        body[field.name] = value;
      }

      await api(
        editingId === null ? endpoint : `${endpoint}/${editingId}`,
        {
          method: editingId === null ? "POST" : updateMethod,
          body,
        }
      );

      resetForm();
      setNotice("Cambios guardados.");

      try {
        await load();
      } catch (error) {
        setReady(false);
        setError(
          `Los cambios se guardaron, pero no se pudo actualizar la lista: ${error.message}`
        );
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(row) {
    if (!ready || busy || !canDelete) return;
    if (!window.confirm("¿Eliminar este registro?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api(`${endpoint}/${row[idField]}`, { method: "DELETE" });

      if (editingId === row[idField]) resetForm();

      setNotice("Registro eliminado.");

      try {
        await load();
      } catch (error) {
        setReady(false);
        setError(
          `Se eliminó el registro, pero no se pudo actualizar la lista: ${error.message}`
        );
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  const showActions = canEdit || canDelete || Boolean(renderExtraActions);

  const filtered = rows.filter((row) => columns.some((column) =>
    String(row[column.name] ?? "").toLocaleLowerCase().includes(search.toLocaleLowerCase())));

  return (
    <section className="management-page">
      <div className="mg-page-heading">
        <div><p className="mg-eyebrow">ADMINISTRACIÓN</p><h1>{title}</h1><p>{description}</p></div>
        {canCreate && <button className="mg-primary" disabled={busy || !ready} onClick={() => {
          resetForm(); setError(""); setNotice(""); setIsOpen(true);
        }}><Icon name="plus" size={18} />Nuevo registro</button>}
      </div>

      {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
      {notice && <p className="mg-alert mg-alert-success" role="status">{notice}</p>}
      {!ready && <button type="button" disabled={busy}
        onClick={() => setReloadKey((value) => value + 1)}>Reintentar carga</button>}

      {isOpen && <Modal title={`${editingId === null ? "Crear" : "Editar"} · ${title}`}
        busy={busy} onClose={resetForm}>
        <form onSubmit={save}><div className="mg-form-body">
        {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
        {editingRow && <p>Registro: {getRecordLabel?.(editingRow) || `#${editingId}`}</p>}

        <fieldset disabled={busy || !ready}>
          <div className="mg-form-grid">
            {fields.map((field) => (
              <label key={field.name}>
                <span>{field.label}{field.required ? " *" : ""}</span>

                {field.type === "select" || field.type === "multiselect" ? (
                  <select
                    multiple={field.type === "multiselect"}
                    disabled={isFieldDisabled(field, editingRow)}
                    required={field.required}
                    value={form[field.name]}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field.name]: field.type === "multiselect"
                          ? Array.from(event.target.selectedOptions, (option) => option.value)
                          : event.target.value,
                      })
                    }
                  >
                    {field.type !== "multiselect" && <option value="">Seleccionar...</option>}

                    {(options[field.lookup] || []).map((option) => (
                      <option
                        key={option[field.optionId]}
                        value={option[field.optionId]}
                      >
                        {option[field.optionLabel || "nombre"]}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    disabled={isFieldDisabled(field, editingRow)}
                    checked={Boolean(form[field.name])}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field.name]: event.target.checked,
                      })
                    }
                  />
                ) : field.type === "textarea" ? (
                  <textarea required={field.required} maxLength={field.maxLength} rows={3}
                    disabled={isFieldDisabled(field, editingRow)}
                    value={form[field.name]} onChange={(event) =>
                      setForm({ ...form, [field.name]: event.target.value })} />
                ) : (
                  <input
                    type={field.type || "text"}
                    disabled={isFieldDisabled(field, editingRow)}
                    required={
                      field.required &&
                      !(field.type === "password" && editingId !== null)
                    }
                    minLength={field.type === "password" ? 8 : undefined}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    maxLength={field.maxLength}
                    autoComplete={
                      field.type === "password" ? "new-password" : undefined
                    }
                    placeholder={
                      field.type === "password" && editingId !== null
                        ? "Vacío para conservar la contraseña"
                        : ""
                    }
                    value={form[field.name]}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field.name]: event.target.value,
                      })
                    }
                  />
                )}
                {field.help && <small>{field.help}</small>}
                {field.lookup && ready && !options[field.lookup]?.length && <small>
                  {field.emptyMessage || "No hay opciones disponibles."}
                </small>}
              </label>
            ))}
          </div>

          <div className="mg-row-actions">
            <button type="submit" className="mg-primary" disabled={busy || !ready}>
              {busy ? "Procesando..." : "Guardar"}
            </button>

            {(
              <button
                type="button"
                className="mg-secondary"
                onClick={resetForm}
              >
                Cancelar
              </button>
            )}
          </div>
        </fieldset>
      </div></form></Modal>}

      <div className="mg-panel">
        <div className="mg-toolbar">
          <label className="mg-search"><Icon name="search" size={18} />
            <input aria-label={`Buscar en ${title}`} placeholder="Buscar registros..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <span className="mg-muted">{filtered.length} registros</span>
          <button className="mg-secondary" disabled={busy || loading} onClick={() => setReloadKey((value) => value + 1)}>Actualizar</button>
        </div>
        <div className="mg-table-scroll"><table className="mg-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.name}>{column.label}</th>
              ))}
              {showActions && <th>Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {filtered.map((row) => (
              <tr key={row[idField]}>
                {columns.map((column) => (
                  <td key={column.name}>
                    {typeof row[column.name] === "boolean"
                      ? (row[column.name] ? "Sí" : "No")
                      : row[column.name] ?? "—"}
                  </td>
                ))}
                {showActions && <td><div className="mg-row-actions">
                  {canEdit && <button type="button" disabled={busy || !ready || !canEditRow(row)}
                    className="mg-secondary" onClick={() => edit(row)}>Editar</button>}
                  {canDelete && <button type="button" className="mg-danger"
                    disabled={busy || !ready} onClick={() => remove(row)}>Eliminar</button>}
                  {renderExtraActions?.(row, busy || !ready)}
                </div></td>}
              </tr>
            ))}

            {(loading || (ready && filtered.length === 0)) && (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)}>
                  {loading ? "Cargando registros..." : "No hay registros que coincidan."}
                </td>
              </tr>
            )}
          </tbody>
        </table></div>
      </div>
    </section>
  );
}
