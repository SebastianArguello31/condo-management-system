import { useCallback, useEffect, useRef, useState } from "react";

import { api, downloadAttachment } from "../../services/api";

const EMPTY_FORM = {
  titulo: "",
  descripcion: "",
  id_unidad: "",
  id_tipo_incidencia: "",
};

export default function IncidentsPage({ user }) {
  const isResident = user.rol === "RESIDENTE";

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    tipos: [],
    unidades: [],
  });
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fileInput = useRef(null);

  const load = useCallback(async () => {
    const [incidents, options] = await Promise.all([
      api("/incidents"),
      isResident
        ? api("/incidents/metadata")
        : Promise.resolve({ tipos: [], unidades: [] }),
    ]);

    setRows(incidents);
    setMetadata(options);
  }, [isResident]);

  useEffect(() => {
    let active = true;

    load()
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [load]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function refresh() {
    setBusy(true);
    setError("");

    try {
      await load();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (files.length > 3) {
      setError("Puedes adjuntar como máximo 3 archivos.");
      return;
    }

    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Cada archivo puede pesar como máximo 5 MB.");
      return;
    }

    setBusy(true);

    try {
      const body = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value.trim());
      });

      files.forEach((file) => body.append("archivos", file));

      const result = await api("/incidents", {
        method: "POST",
        body,
      });

      setNotice(
        `Solicitud #${result.id_incidencia} enviada correctamente.`
      );
      setForm({ ...EMPTY_FORM });
      setFiles([]);

      if (fileInput.current) fileInput.current.value = "";

      try {
        await load();
      } catch (error) {
        setError(
          `La solicitud se guardó, pero no se pudo actualizar la lista: ${error.message}`
        );
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id) {
    setBusy(true);
    setError("");

    try {
      setSelected(await api(`/incidents/${id}`));
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function download(file) {
    setBusy(true);
    setError("");

    try {
      await downloadAttachment(
        file.id_adjuntos_incidencia,
        file.nombre_original
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Cargando solicitudes...</p>;

  const canSubmit =
    metadata.unidades.length > 0 && metadata.tipos.length > 0;

  return (
    <section>
      <h1>
        {isResident ? "Mis solicitudes" : "Solicitudes recibidas"}
      </h1>

      {error && (
        <p className="error" role="alert">{error}</p>
      )}

      {notice && (
        <p className="success" role="status">{notice}</p>
      )}

      {isResident && (
        <form className="card" onSubmit={submit}>
          <h2>Reportar un problema</h2>

          {metadata.unidades.length === 0 && (
            <p>
              No tienes una unidad asociada. Solicita al administrador
              que vincule tu cuenta con una unidad.
            </p>
          )}

          {metadata.tipos.length === 0 && (
            <p>No hay tipos de incidencia disponibles.</p>
          )}

          <fieldset disabled={busy || !canSubmit}>
            <div className="form-grid">
              <label>
                Unidad
                <select
                  name="id_unidad"
                  required
                  value={form.id_unidad}
                  onChange={updateField}
                >
                  <option value="">Seleccionar...</option>

                  {metadata.unidades.map((unit) => (
                    <option
                      key={unit.id_unidad}
                      value={unit.id_unidad}
                    >
                      {unit.edificio} · {unit.codigo}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tipo de problema
                <select
                  name="id_tipo_incidencia"
                  required
                  value={form.id_tipo_incidencia}
                  onChange={updateField}
                >
                  <option value="">Seleccionar...</option>

                  {metadata.tipos.map((type) => (
                    <option
                      key={type.id_tipo_incidencia}
                      value={type.id_tipo_incidencia}
                    >
                      {type.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="incident-field">
              Título
              <input
                name="titulo"
                required
                minLength={5}
                maxLength={150}
                placeholder="Ej.: Pérdida de agua debajo del lavamanos"
                value={form.titulo}
                onChange={updateField}
              />
            </label>

            <label className="incident-field">
              Descripción
              <textarea
                name="descripcion"
                required
                minLength={10}
                maxLength={5000}
                rows={5}
                placeholder="Describe qué ocurre, dónde y desde cuándo."
                value={form.descripcion}
                onChange={updateField}
              />
            </label>

            <label className="incident-field">
              Adjuntos opcionales
              <input
                ref={fileInput}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(event) =>
                  setFiles(Array.from(event.target.files || []))
                }
              />
              <small>Hasta 3 archivos JPG, PNG o PDF de 5 MB cada uno.</small>
            </label>

            {files.length > 0 && (
              <ul>
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    {file.name}
                  </li>
                ))}
              </ul>
            )}

            <button type="submit">
              {busy ? "Procesando..." : "Enviar solicitud"}
            </button>
          </fieldset>
        </form>
      )}

      <div className="card">
        <div className="incident-toolbar">
          <h2>{isResident ? "Historial de solicitudes" : "Bandeja de entrada"}</h2>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={refresh}
          >
            Actualizar
          </button>
        </div>

        {rows.length === 0 && <p>No hay solicitudes.</p>}

        {rows.map((incident) => (
          <article
            className="incident-item"
            key={incident.id_incidencia}
          >
            <div>
              <h3>#{incident.id_incidencia} · {incident.titulo}</h3>

              <p>
                {incident.edificio || "Sin edificio"} · Unidad{" "}
                {incident.unidad || "—"} · {incident.tipo_incidencia}
              </p>

              {!isResident && (
                <p>
                  Residente:{" "}
                  {incident.residente_nombre
                    ? `${incident.residente_nombre} ${incident.residente_apellido}`
                    : "Sin autor registrado"}
                </p>
              )}

              <p>
                <span className="incident-status">{incident.estado}</span>
                {" "}· Prioridad: {incident.prioridad}
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => openDetail(incident.id_incidencia)}
            >
              Ver detalle
            </button>
          </article>
        ))}
      </div>

      {selected && (
        <div className="card">
          <div className="incident-toolbar">
            <h2>Solicitud #{selected.id_incidencia}</h2>
            <button
              type="button"
              className="secondary"
              onClick={() => setSelected(null)}
            >
              Cerrar detalle
            </button>
          </div>

          <h3>{selected.titulo}</h3>

          <p className="incident-description">
            {selected.descripcion}
          </p>

          <p>
            Ubicación: {selected.edificio || "—"} ·{" "}
            {selected.unidad || "—"}
          </p>

          <p>
            Estado: {selected.estado} · Prioridad: {selected.prioridad}
          </p>

          {!isResident && (
            <p>
              Contacto: {selected.residente_email || "Sin contacto"}
            </p>
          )}

          <h3>Archivos adjuntos</h3>

          {selected.adjuntos.length === 0 ? (
            <p>Esta solicitud no tiene adjuntos.</p>
          ) : (
            <ul>
              {selected.adjuntos.map((file) => (
                <li
                  className="incident-attachment"
                  key={file.id_adjuntos_incidencia}
                >
                  <span>{file.nombre_original}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => download(file)}
                  >
                    Descargar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}