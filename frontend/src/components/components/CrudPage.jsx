import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

function emptyForm(fields) {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === "checkbox" ? true : "",
    ])
  );
}

export default function CrudPage({
  title,
  endpoint,
  idField,
  fields,
  columns,
  lookups = [],
  renderExtraActions,
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

  const load = useCallback(async () => {
    const results = await Promise.all([
      api(endpoint),
      ...lookups.map((lookup) => api(lookup.endpoint)),
    ]);

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

    async function initialize() {
      try {
        await load();
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
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(fields));
  }

  function edit(row) {
    setError("");
    setNotice("");
    setEditingId(row[idField]);

    setForm(
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          field.type === "password"
            ? ""
            : row[field.name] ?? "",
        ])
      )
    );
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const body = {};

      for (const field of fields) {
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
          value === ""
        ) {
          throw new Error(`Completa el campo ${field.label}`);
        }

        if (field.type === "select") {
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

  if (loading) return <p>Cargando...</p>;

  return (
    <section>
      <h1>{title}</h1>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success" role="status">{notice}</p>}

      <form className="card" onSubmit={save}>
        <h2>{editingId === null ? "Crear registro" : "Editar registro"}</h2>

        <fieldset disabled={busy || !ready}>
          <div className="form-grid">
            {fields.map((field) => (
              <label key={field.name}>
                {field.label}

                {field.type === "select" ? (
                  <select
                    required={field.required}
                    value={form[field.name]}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field.name]: event.target.value,
                      })
                    }
                  >
                    <option value="">Seleccionar...</option>

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
                    checked={Boolean(form[field.name])}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field.name]: event.target.checked,
                      })
                    }
                  />
                ) : (
                  <input
                    type={field.type || "text"}
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
      </form>

      <div className="card table-container">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.name}>{column.label}</th>
              ))}
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row[idField]}>
                {columns.map((column) => (
                  <td key={column.name}>
                    {typeof row[column.name] === "boolean"
                      ? row[column.name] ? "Sí" : "No"
                      : row[column.name] ?? "—"}
                  </td>
                ))}

                <td>
                  <div className="actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => edit(row)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      disabled={busy}
                      onClick={() => remove(row)}
                    >
                      Eliminar
                    </button>

                    {renderExtraActions?.(row, busy)}
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1}>
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