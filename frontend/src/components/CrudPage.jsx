import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

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
  endpoint,
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
    setEditingId(null);
    setForm(emptyForm(fields));
  }

  function edit(row) {
    if (!ready || busy || !canEdit || !canEditRow(row)) return;
    setError("");
    setNotice("");
    setEditingId(row[idField]);

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

        if (field.type === "multiselect") {
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
          method: editingId === null ? "POST" : "PATCH",
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

  if (loading) return <p>Cargando...</p>;

  return (
    <section>
      <h1>{title}</h1>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success" role="status">{notice}</p>}
      {!ready && <button type="button" disabled={busy}
        onClick={() => setReloadKey((value) => value + 1)}>Reintentar carga</button>}

      {(canCreate || editingId !== null) && <form className="card" onSubmit={save}>
        <h2>{editingId === null ? "Crear registro" : "Editar registro"}</h2>
        {editingRow && <p>Registro: {getRecordLabel?.(editingRow) || `#${editingId}`}</p>}

        <fieldset disabled={busy || !ready}>
          <div className="form-grid">
            {fields.map((field) => (
              <label key={field.name}>
                {field.label}

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

          <div className="actions">
            <button type="submit">
              {busy ? "Procesando..." : "Guardar"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="secondary"
                onClick={resetForm}
              >
                Cancelar
              </button>
            )}
          </div>
        </fieldset>
      </form>}

      <div className="card table-container">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.name}>{column.label}</th>
              ))}
              {showActions && <th>Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row[idField]}>
                {columns.map((column) => (
                  <td key={column.name}>
                    {typeof row[column.name] === "boolean"
                      ? (row[column.name] ? "Sí" : "No")
                      : row[column.name] ?? "—"}
                  </td>
                ))}
                {showActions && <td><div className="actions">
                  {canEdit && <button type="button" disabled={busy || !ready || !canEditRow(row)}
                    onClick={() => edit(row)}>Editar</button>}
                  {canDelete && <button type="button" className="danger"
                    disabled={busy || !ready} onClick={() => remove(row)}>Eliminar</button>}
                  {renderExtraActions?.(row, busy || !ready)}
                </div></td>}
              </tr>
            ))}

            {ready && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)}>
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
