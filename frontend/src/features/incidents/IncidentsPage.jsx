import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api, downloadAttachment } from "../../services/api";

const EMPTY_FORM = {
  titulo: "",
  descripcion: "",
  id_unidad: "",
  id_tipo_incidencia: "",
};



export default function IncidentsPage({ user }) {
  const isAdmin = user.rol === "ADMIN";
  const isResident = user.rol === "RESIDENTE";
  const isTechnician = user.rol === "TECNICO";

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    tipos: [],
    unidades: [],
  });
  const [technicians, setTechnicians] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Filtros
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterOnlyMine, setFilterOnlyMine] = useState(false);

  // Estados de formularios de acción dentro del detalle
  const [assignTechId, setAssignTechId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [actionPriorityId, setActionPriorityId] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [actionComment, setActionComment] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const fileInput = useRef(null);

  const load = useCallback(async () => {
    const promises = [api("/incidents")];

    if (isResident) {
      promises.push(api("/incidents/metadata"));
    } else {
      promises.push(Promise.resolve({ tipos: [], unidades: [] }));
    }

    if (isAdmin || isTechnician) {
      promises.push(api("/incidents/technicians").catch(() => []));
      promises.push(api("/incidents/priorities").catch(() => []));
      promises.push(api("/incidents/statuses").catch(() => []));
    } else {
      promises.push(Promise.resolve([]), Promise.resolve([]), Promise.resolve([]));
    }

    const [incidents, options, techs, prios, stats] = await Promise.all(promises);

    setRows(incidents || []);
    setMetadata(options || { tipos: [], unidades: [] });
    setTechnicians(techs || []);
    setPriorities(prios || []);
    setStatuses(stats || []);
  }, [isResident, isAdmin, isTechnician]);

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
      if (selected) {
        const updated = await api(`/incidents/${selected.id_incidencia}`);
        setSelected(updated);
        syncDetailForm(updated);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function syncDetailForm(incident) {
    if (!incident) return;
    setAssignTechId(incident.id_personal_asignado ? String(incident.id_personal_asignado) : "");
    setAssignNotes(incident.asignacion_notas || "");
    setActionPriorityId(incident.id_prioridad ? String(incident.id_prioridad) : "");
    setActionStatus(incident.estado || "");
    setActionComment("");
  }

  async function openDetail(id) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await api(`/incidents/${id}`);
      setSelected(data);
      syncDetailForm(data);
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

      setNotice(`Solicitud #${result.id_incidencia} enviada correctamente.`);
      setForm({ ...EMPTY_FORM });
      setFiles([]);

      if (fileInput.current) fileInput.current.value = "";

      try {
        await load();
      } catch (error) {
        setError(`La solicitud se guardó, pero no se pudo actualizar la lista: ${error.message}`);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignTechnician(event) {
    event.preventDefault();
    if (!assignTechId) {
      setError("Debes seleccionar un técnico para asignar.");
      return;
    }

    setActionBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await api(`/incidents/${selected.id_incidencia}/assign`, {
        method: "POST",
        body: {
          id_personal_asignado: Number(assignTechId),
          notas: assignNotes.trim() || null,
        },
      });

      setNotice(result.mensaje || "Técnico asignado exitosamente.");
      const updated = await api(`/incidents/${selected.id_incidencia}`);
      setSelected(updated);
      syncDetailForm(updated);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUpdatePriority(event) {
    event.preventDefault();
    if (!actionPriorityId) {
      setError("Debes seleccionar una prioridad.");
      return;
    }

    setActionBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await api(`/incidents/${selected.id_incidencia}/priority`, {
        method: "PATCH",
        body: {
          id_prioridad: Number(actionPriorityId),
        },
      });

      setNotice(result.mensaje || "Prioridad actualizada correctamente.");
      const updated = await api(`/incidents/${selected.id_incidencia}`);
      setSelected(updated);
      syncDetailForm(updated);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUpdateStatus(event) {
    event.preventDefault();
    if (!actionStatus) {
      setError("Debes seleccionar un estado.");
      return;
    }

    setActionBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await api(`/incidents/${selected.id_incidencia}/status`, {
        method: "PATCH",
        body: {
          estado: actionStatus,
          comentario: actionComment.trim() || null,
        },
      });

      setNotice(result.mensaje || "Estado actualizado correctamente.");
      const updated = await api(`/incidents/${selected.id_incidencia}`);
      setSelected(updated);
      syncDetailForm(updated);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancelResident() {
    if (!window.confirm("¿Seguro que deseas cancelar esta solicitud?")) return;

    setActionBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await api(`/incidents/${selected.id_incidencia}/status`, {
        method: "PATCH",
        body: {
          estado: "CANCELADA",
          comentario: "Cancelada por el residente.",
        },
      });

      setNotice(result.mensaje || "Solicitud cancelada.");
      const updated = await api(`/incidents/${selected.id_incidencia}`);
      setSelected(updated);
      syncDetailForm(updated);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  async function download(file) {
    setBusy(true);
    setError("");

    try {
      await downloadAttachment(file.id_adjuntos_incidencia, file.nombre_original);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Filtrado de incidencias
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterStatus && row.estado !== filterStatus) return false;
      if (filterPriority && row.prioridad !== filterPriority) return false;
      if (filterOnlyMine && isTechnician) {
        if (row.id_personal_asignado !== user.id_usuario) return false;
      }
      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const titleMatch = (row.titulo || "").toLowerCase().includes(query);
        const descMatch = (row.descripcion || "").toLowerCase().includes(query);
        const codeMatch = String(row.id_incidencia).includes(query);
        const unitMatch = (row.unidad || "").toLowerCase().includes(query);
        const residentMatch = `${row.residente_nombre || ""} ${row.residente_apellido || ""}`
          .toLowerCase()
          .includes(query);
        if (!titleMatch && !descMatch && !codeMatch && !unitMatch && !residentMatch) {
          return false;
        }
      }
      return true;
    });
  }, [rows, filterStatus, filterPriority, filterSearch, filterOnlyMine, isTechnician, user.id_usuario]);

  if (loading) return <p>Cargando solicitudes...</p>;

  const canSubmit = metadata.unidades.length > 0 && metadata.tipos.length > 0;

  // Estados permitidos según el rol
  const allowedStatuses = isTechnician
    ? ["EN_PROCESO", "EN_ESPERA", "RESUELTA"]
    : statuses.length > 0
      ? statuses.map((s) => s.nombre)
      : [
        "RECIBIDA",
        "EN_REVISION",
        "ASIGNADA",
        "EN_PROCESO",
        "EN_ESPERA",
        "RESUELTA",
        "CERRADA",
        "RECHAZADA",
        "CANCELADA",
      ];

  return (
    <section>
      <h1>
        {isResident
          ? "Mis solicitudes"
          : isTechnician
            ? "Incidencias asignadas y tareas"
            : "Gestión de Incidencias"}
      </h1>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}

      {isResident && (
        <form className="card" onSubmit={submit}>
          <h2>Reportar una incidencia</h2>

          {metadata.unidades.length === 0 && (
            <p>
              No tienes una unidad asociada. Solicita al administrador que vincule tu cuenta con una
              unidad.
            </p>
          )}

          {metadata.tipos.length === 0 && <p>No hay tipos de incidencia disponibles.</p>}

          <fieldset disabled={busy || !canSubmit}>
            <div className="form-grid">
              <label>
                Unidad
                <select name="id_unidad" required value={form.id_unidad} onChange={updateField}>
                  <option value="">Seleccionar...</option>
                  {metadata.unidades.map((unit) => (
                    <option key={unit.id_unidad} value={unit.id_unidad}>
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
                    <option key={type.id_tipo_incidencia} value={type.id_tipo_incidencia}>
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
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
              />
              <small>Hasta 3 archivos JPG, PNG o PDF de 5 MB cada uno.</small>
            </label>

            {files.length > 0 && (
              <ul>
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>{file.name}</li>
                ))}
              </ul>
            )}

            <button type="submit">{busy ? "Procesando..." : "Enviar solicitud"}</button>
          </fieldset>
        </form>
      )}

      {/* Lista de solicitudes y filtros */}
      <div className="card">
        <div className="incident-toolbar">
          <h2>{isResident ? "Historial de solicitudes" : "Bandeja de incidencias"}</h2>
          <button type="button" className="secondary" disabled={busy} onClick={refresh}>
            Actualizar
          </button>
        </div>

        {/* Barra de Filtros */}
        {!isResident && (
          <div className="filter-bar">
            <input
              type="search"
              placeholder="Buscar por título, unidad..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              {allowedStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {priorities.length > 0 && (
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="">Todas las prioridades</option>
                {priorities.map((p) => (
                  <option key={p.id_prioridad} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            )}

            {isTechnician && (
              <label style={{ flexDirection: "row", alignItems: "center", gap: 6, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={filterOnlyMine}
                  onChange={(e) => setFilterOnlyMine(e.target.checked)}
                />
                Solo asignadas a mí
              </label>
            )}
          </div>
        )}

        {filteredRows.length === 0 && <p>No se encontraron solicitudes.</p>}

        {filteredRows.map((incident) => (
          <article className="incident-item" key={incident.id_incidencia}>
            <div>
              <h3>
                #{incident.id_incidencia} · {incident.titulo}
              </h3>

              <p>
                {incident.edificio || "Sin edificio"} · Unidad {incident.unidad || "—"} ·{" "}
                {incident.tipo_incidencia}
              </p>

              {!isResident && (
                <p>
                  <strong>Residente:</strong>{" "}
                  {incident.residente_nombre
                    ? `${incident.residente_nombre} ${incident.residente_apellido}`
                    : "Sin autor registrado"}
                </p>
              )}

              {incident.tecnico_asignado_nombre && (
                <p>
                  <strong>Técnico:</strong> {incident.tecnico_asignado_nombre}
                </p>
              )}

              <p>
                <span className={`status-badge status-${incident.estado}`}>{incident.estado}</span>
                {" "}· Prioridad: <strong>{incident.prioridad || "Sin asignar"}</strong>
                {incident.fecha_limite && (
                  <span> · Límite: {new Date(incident.fecha_limite).toLocaleDateString()}</span>
                )}
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

      {/* Detalle y Gestión de la Incidencia Seleccionada */}
      {selected && (
        <div className="card">
          <div className="incident-toolbar">
            <h2>Detalle de Incidencia #{selected.id_incidencia}</h2>
            <button
              type="button"
              className="secondary"
              onClick={() => setSelected(null)}
            >
              Cerrar detalle
            </button>
          </div>

          <h3>{selected.titulo}</h3>

          <p className="incident-description">{selected.descripcion}</p>

          <p>
            <strong>Ubicación:</strong> {selected.edificio || "—"} · Unidad {selected.unidad || "—"}
          </p>

          <p>
            <strong>Estado actual:</strong>{" "}
            <span className={`status-badge status-${selected.estado}`}>{selected.estado}</span>
            {"  "}
            <strong>Prioridad:</strong> {selected.prioridad || "Sin prioridad asignada"}
          </p>

          {selected.fecha_reporte && (
            <p>
              <strong>Reportado el:</strong> {new Date(selected.fecha_reporte).toLocaleString()}
            </p>
          )}

          {selected.fecha_limite && (
            <p>
              <strong>Fecha límite de resolución:</strong>{" "}
              {new Date(selected.fecha_limite).toLocaleString()}
            </p>
          )}

          {selected.fecha_resolucion && (
            <p>
              <strong>Fecha de resolución:</strong>{" "}
              {new Date(selected.fecha_resolucion).toLocaleString()}
            </p>
          )}

          {!isResident && (
            <p>
              <strong>Contacto Residente:</strong> {selected.residente_email || "Sin email registrado"}
              {selected.residente_telefono ? ` · Tel: ${selected.residente_telefono}` : ""}
            </p>
          )}

          <p>
            <strong>Técnico Responsable:</strong>{" "}
            {selected.tecnico_asignado_nombre ? (
              <span>
                {selected.tecnico_asignado_nombre}
                {selected.tecnico_asignado_email ? ` (${selected.tecnico_asignado_email})` : ""}
                {selected.asignacion_notas ? ` — Nota: "${selected.asignacion_notas}"` : ""}
              </span>
            ) : (
              <em>Sin técnico asignado aún</em>
            )}
          </p>

          {/* ACCIONES OPERATIVAS: Asignación, Prioridad y Estado */}
          {(isAdmin || isTechnician) && (
            <div className="detail-grid">
              {/* ASIGNACIÓN DE TÉCNICO (Solo Admin) */}
              {isAdmin && (
                <div className="detail-section">
                  <h4>Asignar Técnico</h4>
                  <form onSubmit={handleAssignTechnician}>
                    <label>
                      Personal Técnico
                      <select
                        value={assignTechId}
                        onChange={(e) => setAssignTechId(e.target.value)}
                        required
                        disabled={actionBusy}
                      >
                        <option value="">Seleccionar técnico...</option>
                        {technicians.map((t) => (
                          <option key={t.id_usuario} value={t.id_usuario}>
                            {t.nombre} {t.apellido}
                            {t.especialidades && t.especialidades.length > 0
                              ? ` (${t.especialidades.join(", ")})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ marginTop: 10 }}>
                      Notas para el técnico (opcional)
                      <textarea
                        rows={2}
                        placeholder="Ej.: Llevar herramientas para tuberías"
                        value={assignNotes}
                        onChange={(e) => setAssignNotes(e.target.value)}
                        disabled={actionBusy}
                      />
                    </label>

                    <button
                      type="submit"
                      style={{ marginTop: 12, width: "100%" }}
                      disabled={actionBusy || !assignTechId}
                    >
                      {actionBusy ? "Guardando..." : selected.id_personal_asignado ? "Reasignar Técnico" : "Asignar Técnico"}
                    </button>
                  </form>
                </div>
              )}

              {/* CAMBIAR PRIORIDAD (Solo Admin) */}
              {isAdmin && (
                <div className="detail-section">
                  <h4>Gestionar Prioridad</h4>
                  <form onSubmit={handleUpdatePriority}>
                    <label>
                      Prioridad
                      <select
                        value={actionPriorityId}
                        onChange={(e) => setActionPriorityId(e.target.value)}
                        required
                        disabled={actionBusy}
                      >
                        <option value="">Seleccionar prioridad...</option>
                        {priorities.map((p) => (
                          <option key={p.id_prioridad} value={p.id_prioridad}>
                            {p.nombre} ({p.horas_resolucion}h límite)
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="submit"
                      style={{ marginTop: 12, width: "100%" }}
                      disabled={actionBusy || !actionPriorityId}
                    >
                      {actionBusy ? "Guardando..." : "Actualizar Prioridad"}
                    </button>
                  </form>
                </div>
              )}

              {/* CAMBIAR ESTADO (Admin y Técnico) */}
              <div className="detail-section">
                <h4>Actualizar Estado</h4>
                <form onSubmit={handleUpdateStatus}>
                  <label>
                    Nuevo Estado
                    <select
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value)}
                      required
                      disabled={actionBusy}
                    >
                      <option value="">Seleccionar estado...</option>
                      {allowedStatuses.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ marginTop: 10 }}>
                    Comentario de cambio (opcional)
                    <textarea
                      rows={2}
                      placeholder="Motivo del cambio de estado o avance realizado..."
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      disabled={actionBusy}
                    />
                  </label>

                  <button
                    type="submit"
                    style={{ marginTop: 12, width: "100%" }}
                    disabled={actionBusy || !actionStatus}
                  >
                    {actionBusy ? "Guardando..." : "Cambiar Estado"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Cancelar por parte del residente */}
          {isResident && ["RECIBIDA", "EN_REVISION"].includes(selected.estado) && (
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                className="danger"
                disabled={actionBusy}
                onClick={handleCancelResident}
              >
                Cancelar mi solicitud
              </button>
            </div>
          )}

          {/* TRAZABILIDAD / LÍNEA DE TIEMPO DE ESTADOS */}
          {selected.historial && selected.historial.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3>Línea de tiempo y trazabilidad</h3>
              <ul className="timeline">
                {selected.historial.map((item, idx) => (
                  <li className="timeline-item" key={item.id_historial_incidencia || idx}>
                    <div className="timeline-header">
                      <strong>
                        {item.estado_anterior ? `${item.estado_anterior} ➔ ` : ""}
                        <span className={`status-badge status-${item.estado_nuevo}`}>
                          {item.estado_nuevo}
                        </span>
                      </strong>
                      <span>{item.fecha ? new Date(item.fecha).toLocaleString() : ""}</span>
                    </div>
                    <div className="timeline-body">
                      {item.usuario_nombre && (
                        <div>
                          <small>Por: {item.usuario_nombre}</small>
                        </div>
                      )}
                      {item.comentario && <p style={{ margin: "4px 0 0" }}>"{item.comentario}"</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* HISTORIAL DE ASIGNACIONES */}
          {selected.asignaciones && selected.asignaciones.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3>Historial de Asignaciones</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Fecha asignación</th>
                      <th>Notas</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.asignaciones.map((asig, idx) => (
                      <tr key={asig.id_asignacion || idx}>
                        <td>{asig.tecnico_nombre}</td>
                        <td>{asig.fecha_asignacion ? new Date(asig.fecha_asignacion).toLocaleString() : "—"}</td>
                        <td>{asig.notas || "—"}</td>
                        <td>
                          {asig.activa ? (
                            <strong style={{ color: "#15803d" }}>Activa</strong>
                          ) : (
                            <span style={{ color: "#64748b" }}>Anterior</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ARCHIVOS ADJUNTOS */}
          <div style={{ marginTop: 24 }}>
            <h3>Archivos adjuntos</h3>
            {!selected.adjuntos || selected.adjuntos.length === 0 ? (
              <p>Esta solicitud no tiene adjuntos.</p>
            ) : (
              <ul>
                {selected.adjuntos.map((file) => (
                  <li className="incident-attachment" key={file.id_adjuntos_incidencia}>
                    <span>{file.nombre_original}</span>
                    <button type="button" disabled={busy} onClick={() => download(file)}>
                      Descargar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}