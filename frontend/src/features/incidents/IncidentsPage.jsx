import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, downloadAttachment } from "../../services/api";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";

const EMPTY_FORM = {
  titulo: "",
  descripcion: "",
  id_unidad: "",
  id_tipo_incidencia: "",
};

function formatElapsed(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return "Recién creado";
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Recién creado";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return "Hace 1 día";
  return `Hace ${diffDays} días`;
}

function formatDateTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Filtros de listado
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);

  // Estados de formularios dentro del Modal de detalle
  const [assignTechId, setAssignTechId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [actionPriorityId, setActionPriorityId] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [actionComment, setActionComment] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [modalTab, setModalTab] = useState("info"); // "info", "actions", "timeline"

  const fileInput = useRef(null);

  const load = useCallback(async () => {
    const promises = [api("/incidents")];

    if (isResident) {
      promises.push(api("/incidents/metadata").catch(() => ({ tipos: [], unidades: [] })));
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
    setLoading(true);
    setError("");

    load()
      .catch((err) => {
        if (active) setError(err.message);
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
    } catch (err) {
      setError(err.message);
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
    setModalTab("info");
  }

  async function openDetail(id) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await api(`/incidents/${id}`);
      setSelected(data);
      syncDetailForm(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReport(event) {
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
      setIsCreateOpen(false);

      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignTechnician(event) {
    event.preventDefault();
    if (!assignTechId) {
      setError("Debes seleccionar un técnico.");
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
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Filtrado de filas
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.estado !== statusFilter) return false;
      if (priorityFilter !== "all" && row.prioridad !== priorityFilter) return false;
      if (onlyMine && isTechnician) {
        if (row.id_personal_asignado !== user.id_usuario) return false;
      }
      if (search) {
        const query = search.toLowerCase();
        const titleMatch = (row.titulo || "").toLowerCase().includes(query);
        const descMatch = (row.descripcion || "").toLowerCase().includes(query);
        const codeMatch = String(row.id_incidencia).includes(query);
        const unitMatch = (row.unidad || "").toLowerCase().includes(query);
        const resMatch = `${row.residente_nombre || ""} ${row.residente_apellido || ""}`
          .toLowerCase()
          .includes(query);
        if (!titleMatch && !descMatch && !codeMatch && !unitMatch && !resMatch) {
          return false;
        }
      }
      return true;
    });
  }, [rows, statusFilter, priorityFilter, search, onlyMine, isTechnician, user.id_usuario]);

  // Estados permitidos según rol
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

  // Métricas para estadísticas superiores
  const openCount = rows.filter((r) =>
    ["RECIBIDA", "EN_REVISION", "ASIGNADA", "EN_PROCESO", "EN_ESPERA"].includes(r.estado)
  ).length;
  const resolvedCount = rows.filter((r) => ["RESUELTA", "CERRADA"].includes(r.estado)).length;

  const canSubmit = metadata.unidades.length > 0 && metadata.tipos.length > 0;

  return (
    <section className="management-page">
      {/* Encabezado con el estilo oficial de la plataforma */}
      <div className="mg-page-heading">
        <div>
          <p className="mg-eyebrow">
            {isResident ? "MI CONDOMINIO" : "GESTIÓN OPERATIVA"}
          </p>
          <h1>{isResident ? "Mis Solicitudes" : isTechnician ? "Tareas Asignadas" : "Incidencias"}</h1>
          <p>
            {isResident
              ? "Reporta problemas en tu unidad y consulta el estado de atención."
              : isTechnician
              ? "Atiende las solicitudes de mantenimiento asignadas y actualiza su progreso."
              : "Bandeja general de solicitudes, asignación de personal técnico y seguimiento de estados."}
          </p>
        </div>

        {isResident && (
          <button
            className="mg-primary"
            disabled={busy}
            onClick={() => setIsCreateOpen(true)}
          >
            <Icon name="plus" size={18} />
            Nueva solicitud
          </button>
        )}
      </div>

      {/* Tarjetas de estadísticas unificadas */}
      <div className="mg-stats">
        <div className="mg-stat">
          <div>
            <span>Total solicitudes</span>
            <strong>{loading ? "—" : rows.length}</strong>
          </div>
          <span className="mg-stat-icon">
            <Icon name="incidents" size={23} />
          </span>
        </div>

        <div className="mg-stat">
          <div>
            <span>En curso / Pendientes</span>
            <strong>{loading ? "—" : openCount}</strong>
          </div>
          <span className="mg-stat-icon">
            <Icon name="refresh" size={23} />
          </span>
        </div>

        <div className="mg-stat">
          <div>
            <span>Resueltas</span>
            <strong>{loading ? "—" : resolvedCount}</strong>
          </div>
          <span className="mg-stat-icon">
            <Icon name="check" size={23} />
          </span>
        </div>
      </div>

      {error && (
        <div className="mg-alert mg-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="mg-alert mg-alert-success" role="status">
          {notice}
        </div>
      )}

      {/* Panel principal de tabla con buscador y filtros estándar */}
      <div className="mg-panel">
        <div className="mg-toolbar">
          <label className="mg-search">
            <Icon name="search" size={19} />
            <span className="mg-sr-only">Buscar incidencias</span>
            <input
              type="search"
              placeholder="Buscar por título, unidad o residente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="mg-filters">
            <label>
              <span className="mg-sr-only">Filtrar por estado</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                {allowedStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>

            {!isResident && priorities.length > 0 && (
              <label>
                <span className="mg-sr-only">Filtrar por prioridad</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">Todas las prioridades</option>
                  {priorities.map((p) => (
                    <option key={p.id_prioridad} value={p.nombre}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isTechnician && (
              <label className="mg-check-field" style={{ gap: 6, cursor: "pointer", fontSize: 12, padding: "0 8px" }}>
                <input
                  type="checkbox"
                  checked={onlyMine}
                  onChange={(e) => setOnlyMine(e.target.checked)}
                />
                Solo mías
              </label>
            )}

            <button
              className="mg-icon-button"
              title="Actualizar listado"
              aria-label="Actualizar listado"
              disabled={loading || busy}
              onClick={refresh}
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mg-empty" role="status">
            Cargando incidencias...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="mg-empty">
            <h2>{rows.length ? "Sin coincidencias" : "No hay incidencias registradas"}</h2>
            <p>Las solicitudes y tareas de mantenimiento aparecerán en esta bandeja.</p>
          </div>
        ) : (
          <div className="mg-table-scroll">
            <table className="mg-table">
              <thead>
                <tr>
                  <th>Incidencia</th>
                  <th>Ubicación</th>
                  <th>Tipo</th>
                  {!isResident && <th>Prioridad</th>}
                  <th>Estado</th>
                  {!isResident && <th>Tiempo abierto</th>}
                  {!isResident && <th>Técnico Asignado</th>}
                  <th className="mg-actions-heading">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((incident) => {
                  const dateStr = incident.fecha_reporte || incident.fecha_creacion;
                  const isPending = ["RECIBIDA", "EN_REVISION", "ASIGNADA", "EN_PROCESO", "EN_ESPERA"].includes(incident.estado);
                  const techName = incident.tecnico_asignado_nombre || incident.tecnico_asignado;

                  return (
                    <tr key={incident.id_incidencia}>
                      <td>
                        <div className="mg-identity">
                          <span className="mg-avatar" style={{ fontSize: 11, fontWeight: 700 }}>
                            #{incident.id_incidencia}
                          </span>
                          <div>
                            <strong>{incident.titulo}</strong>
                            <span>
                              {dateStr ? formatDateTime(dateStr) : "Reciente"}
                              {incident.residente_nombre && !isResident
                                ? ` · ${incident.residente_nombre} ${incident.residente_apellido || ""}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="mg-tag">
                          {incident.edificio ? `${incident.edificio} · ` : ""}{incident.unidad || "Áreas comunes"}
                        </span>
                      </td>

                      <td className="mg-muted">
                        {incident.tipo_incidencia || "General"}
                      </td>

                      {!isResident && (
                        <td>
                          <span
                            className={`priority-badge ${
                              incident.prioridad?.toLowerCase().includes("alta") ||
                              incident.prioridad?.toLowerCase().includes("urgente")
                                ? "urgent"
                                : incident.prioridad?.toLowerCase().includes("media")
                                ? "normal"
                                : "low"
                            }`}
                          >
                            {incident.prioridad || "Normal"}
                          </span>
                        </td>
                      )}

                      <td>
                        <span className={`status-badge status-${incident.estado}`}>
                          {incident.estado}
                        </span>
                      </td>

                      {!isResident && (
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <strong style={{ fontSize: 12, color: isPending ? "#0f766e" : "#475569" }}>
                              {formatElapsed(dateStr)}
                            </strong>
                            <small style={{ fontSize: 11, color: "#94a3b8" }}>
                              {dateStr ? formatDateTime(dateStr) : "—"}
                            </small>
                          </div>
                        </td>
                      )}

                      {!isResident && (
                        <td>
                          {techName ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Icon name="employees" size={15} />
                              <strong>{techName}</strong>
                            </div>
                          ) : (
                            <span className="mg-muted">Sin asignar</span>
                          )}
                        </td>
                      )}

                      <td>
                        <div className="mg-row-actions">
                          <button
                            type="button"
                            className="mg-icon-button"
                            title="Ver detalle"
                            aria-label="Ver detalle"
                            disabled={busy}
                            onClick={() => openDetail(incident.id_incidencia)}
                          >
                            <Icon name="eye" size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: DETALLE, ASIGNACIÓN Y GESTIÓN DE INCIDENCIA         */}
      {/* ============================================================ */}
      {selected && (
        <Modal
          title={`Incidencia #${selected.id_incidencia}`}
          description={`Reportada por ${selected.residente_nombre || "Residente"} ${
            selected.residente_apellido || ""
          } · ${selected.edificio || "Condominio"} · Unidad ${selected.unidad || "—"}`}
          busy={actionBusy || busy}
          onClose={() => setSelected(null)}
        >
          {/* Navegación interna por pestañas en el modal */}
          <div style={{ display: "flex", gap: 8, padding: "12px 28px 0", borderBottom: "1px solid #edf1ef" }}>
            <button
              type="button"
              className={modalTab === "info" ? "mg-primary" : "mg-secondary"}
              style={{ minHeight: 32, padding: "6px 12px", fontSize: 11 }}
              onClick={() => setModalTab("info")}
            >
              Detalles
            </button>
            {(isAdmin || isTechnician) && (
              <button
                type="button"
                className={modalTab === "actions" ? "mg-primary" : "mg-secondary"}
                style={{ minHeight: 32, padding: "6px 12px", fontSize: 11 }}
                onClick={() => setModalTab("actions")}
              >
                Gestión y Asignación
              </button>
            )}
            <button
              type="button"
              className={modalTab === "timeline" ? "mg-primary" : "mg-secondary"}
              style={{ minHeight: 32, padding: "6px 12px", fontSize: 11 }}
              onClick={() => setModalTab("timeline")}
            >
              Historial
            </button>
          </div>

          <div className="mg-form-body">
            {/* PESTAÑA 1: INFORMACIÓN GENERAL */}
            {modalTab === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{selected.titulo}</h3>
                  <div style={{ background: "#f8faf9", border: "1px solid #e0e7e3", padding: 14, borderRadius: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {selected.descripcion}
                    </p>
                  </div>
                </div>

                <div className="mg-form-grid" style={{ gap: 12 }}>
                  <div>
                    <small style={{ color: "#7c8d92", display: "block" }}>Estado actual</small>
                    <span className={`status-badge status-${selected.estado}`} style={{ marginTop: 4 }}>
                      {selected.estado}
                    </span>
                  </div>

                  {!isResident && (
                    <div>
                      <small style={{ color: "#7c8d92", display: "block" }}>Prioridad</small>
                      <strong style={{ fontSize: 13, marginTop: 4, display: "inline-block" }}>
                        {selected.prioridad || "Sin prioridad"}
                      </strong>
                    </div>
                  )}

                  <div>
                    <small style={{ color: "#7c8d92", display: "block" }}>Fecha de reporte</small>
                    <span style={{ fontSize: 12 }}>
                      {selected.fecha_reporte ? new Date(selected.fecha_reporte).toLocaleString() : "—"}
                    </span>
                  </div>

                  <div>
                    <small style={{ color: "#7c8d92", display: "block" }}>Fecha límite de resolución</small>
                    <span style={{ fontSize: 12 }}>
                      {selected.fecha_limite ? new Date(selected.fecha_limite).toLocaleString() : "Sin fecha límite"}
                    </span>
                  </div>

                  {!isResident && (
                    <div className="mg-full-field">
                      <small style={{ color: "#7c8d92", display: "block" }}>Contacto del Residente</small>
                      <span style={{ fontSize: 12 }}>
                        {selected.residente_email || "Sin email"}
                        {selected.residente_telefono ? ` · Tel: ${selected.residente_telefono}` : ""}
                      </span>
                    </div>
                  )}

                  <div className="mg-full-field">
                    <small style={{ color: "#7c8d92", display: "block" }}>Técnico Responsable</small>
                    {selected.tecnico_asignado_nombre ? (
                      <div style={{ marginTop: 4, fontSize: 13 }}>
                        <strong>{selected.tecnico_asignado_nombre}</strong>
                        {selected.tecnico_asignado_email && (
                          <span className="mg-muted"> ({selected.tecnico_asignado_email})</span>
                        )}
                        {selected.asignacion_notas && (
                          <div style={{ fontSize: 12, color: "#4f6a62", marginTop: 2 }}>
                            <em>"{selected.asignacion_notas}"</em>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="mg-muted" style={{ fontStyle: "italic", fontSize: 12 }}>
                        Sin técnico asignado aún
                      </span>
                    )}
                  </div>
                </div>

                {/* Archivos adjuntos */}
                <div>
                  <h4 style={{ margin: "14px 0 8px", fontSize: 13, color: "#475c55" }}>Archivos Adjuntos</h4>
                  {!selected.adjuntos || selected.adjuntos.length === 0 ? (
                    <p className="mg-muted" style={{ fontSize: 12, margin: 0 }}>
                      No se adjuntaron archivos en este reporte.
                    </p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      {selected.adjuntos.map((file) => (
                        <li
                          key={file.id_adjuntos_incidencia}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            border: "1px solid #e1e7e4",
                            borderRadius: 6,
                            background: "#fdfdfd",
                          }}
                        >
                          <span style={{ fontSize: 12, overflowWrap: "anywhere" }}>{file.nombre_original}</span>
                          <button
                            type="button"
                            className="mg-secondary"
                            style={{ minHeight: 28, padding: "4px 10px", fontSize: 11 }}
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

                {/* Acción para cancelar por parte del residente */}
                {isResident && ["RECIBIDA", "EN_REVISION"].includes(selected.estado) && (
                  <div style={{ borderTop: "1px solid #edf1ef", paddingTop: 14 }}>
                    <button
                      type="button"
                      className="mg-danger"
                      style={{ width: "100%" }}
                      disabled={actionBusy}
                      onClick={handleCancelResident}
                    >
                      Cancelar mi solicitud
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA 2: GESTIÓN DE TÉCNICO Y ESTADO */}
            {modalTab === "actions" && (isAdmin || isTechnician) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* CAMBIAR ESTADO (Técnico y Admin) */}
                <div style={{ background: "#f9fbfa", padding: 16, borderRadius: 8, border: "1px solid #e2eae6" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#186553" }}>
                    Actualizar Estado Operativo
                  </h4>
                  <form onSubmit={handleUpdateStatus}>
                    <div className="mg-form-grid" style={{ gap: 12 }}>
                      <label>
                        <span>Nuevo Estado *</span>
                        <select
                          value={actionStatus}
                          onChange={(e) => setActionStatus(e.target.value)}
                          required
                          disabled={actionBusy}
                        >
                          <option value="">Seleccionar...</option>
                          {allowedStatuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="mg-full-field">
                        <span>Comentario de avance o motivo</span>
                        <textarea
                          rows={2}
                          placeholder="Describe el avance técnico realizado o la justificación del cambio..."
                          value={actionComment}
                          onChange={(e) => setActionComment(e.target.value)}
                          disabled={actionBusy}
                        />
                      </label>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <button
                        type="submit"
                        className="mg-primary"
                        disabled={actionBusy || !actionStatus}
                      >
                        {actionBusy ? "Guardando..." : "Actualizar Estado"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* ASIGNACIÓN DE TÉCNICO (Solo Admin) */}
                {isAdmin && (
                  <div style={{ background: "#f9fbfa", padding: 16, borderRadius: 8, border: "1px solid #e2eae6" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#186553" }}>
                      Asignar Técnico
                    </h4>
                    <form onSubmit={handleAssignTechnician}>
                      <div className="mg-form-grid" style={{ gap: 12 }}>
                        <label className="mg-full-field">
                          <span>Personal Técnico *</span>
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

                        <label className="mg-full-field">
                          <span>Notas e instrucciones para el técnico</span>
                          <textarea
                            rows={2}
                            placeholder="Indicaciones para la visita, herramientas requeridas, etc."
                            value={assignNotes}
                            onChange={(e) => setAssignNotes(e.target.value)}
                            disabled={actionBusy}
                          />
                        </label>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                        <button
                          type="submit"
                          className="mg-primary"
                          disabled={actionBusy || !assignTechId}
                        >
                          {actionBusy ? "Guardando..." : selected.id_personal_asignado ? "Reasignar Técnico" : "Asignar Técnico"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* GESTIÓN DE PRIORIDAD (Solo Admin) */}
                {isAdmin && (
                  <div style={{ background: "#f9fbfa", padding: 16, borderRadius: 8, border: "1px solid #e2eae6" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#186553" }}>
                      Nivel de Prioridad
                    </h4>
                    <form onSubmit={handleUpdatePriority}>
                      <div className="mg-form-grid" style={{ gap: 12 }}>
                        <label className="mg-full-field">
                          <span>Prioridad *</span>
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
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                        <button
                          type="submit"
                          className="mg-secondary"
                          disabled={actionBusy || !actionPriorityId}
                        >
                          {actionBusy ? "Guardando..." : "Guardar Prioridad"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA 3: HISTORIAL DE CAMBIOS */}
            {modalTab === "timeline" && (
              <div>
                <h4 style={{ margin: "0 0 14px", fontSize: 14 }}>Historial de Cambios</h4>
                {!selected.historial || selected.historial.length === 0 ? (
                  <p className="mg-muted">No hay registros de historial aún.</p>
                ) : (
                  <ul className="timeline">
                    {selected.historial.map((item, idx) => (
                      <li className="timeline-item" key={item.id_historial_incidencia || item.id_historial || idx}>
                        <div className="timeline-header">
                          <strong>
                            {item.estado_anterior ? `${item.estado_anterior} ➔ ` : ""}
                            <span className={`status-badge status-${item.estado_nuevo}`}>
                              {item.estado_nuevo}
                            </span>
                          </strong>
                          <span>
                            {item.fecha || item.fecha_cambio
                              ? formatDateTime(item.fecha || item.fecha_cambio)
                              : ""}
                          </span>
                        </div>
                        <div className="timeline-body">
                          {(item.usuario_nombre || item.cambiado_por) && (
                            <div>
                              <small style={{ color: "#64748b" }}>
                                Por: {item.usuario_nombre || item.cambiado_por}
                              </small>
                            </div>
                          )}
                          {item.comentario && (
                            <p style={{ margin: "4px 0 0", color: "#334155" }}>"{item.comentario}"</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Historial de asignaciones previas */}
                {selected.asignaciones && selected.asignaciones.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#475c55" }}>
                      Historial de Asignaciones
                    </h4>
                    <div className="mg-table-scroll">
                      <table className="mg-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>Técnico</th>
                            <th>Fecha</th>
                            <th>Notas</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.asignaciones.map((asig, idx) => (
                            <tr key={asig.id_asignacion || idx}>
                              <td><strong>{asig.tecnico_nombre}</strong></td>
                              <td className="mg-muted">
                                {asig.fecha_asignacion ? new Date(asig.fecha_asignacion).toLocaleString() : "—"}
                              </td>
                              <td>{asig.notas || "—"}</td>
                              <td>
                                {asig.activa ? (
                                  <span className="mg-status is-active"><i />Activa</span>
                                ) : (
                                  <span className="mg-status is-inactive"><i />Anterior</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mg-modal-actions">
            <button
              type="button"
              className="mg-secondary"
              onClick={() => setSelected(null)}
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: NUEVA SOLICITUD DE INCIDENCIA (PARA RESIDENTES)     */}
      {/* ============================================================ */}
      {isCreateOpen && (
        <Modal
          title="Reportar una incidencia"
          description="Describe el problema de tu unidad o área común para que el equipo lo atienda."
          busy={busy}
          onClose={() => setIsCreateOpen(false)}
        >
          <form onSubmit={submitReport}>
            <div className="mg-form-body">
              {metadata.unidades.length === 0 && (
                <div className="mg-alert mg-alert-error" style={{ marginBottom: 16 }}>
                  No tienes una unidad asociada. Solicita al administrador que vincule tu cuenta con una unidad.
                </div>
              )}

              {metadata.tipos.length === 0 && (
                <div className="mg-alert mg-alert-error" style={{ marginBottom: 16 }}>
                  No hay tipos de incidencia disponibles en este momento.
                </div>
              )}

              <fieldset disabled={busy || !canSubmit}>
                <div className="mg-form-grid">
                  <label>
                    <span>Unidad <span className="mg-required">*</span></span>
                    <select
                      name="id_unidad"
                      required
                      value={form.id_unidad}
                      onChange={updateField}
                    >
                      <option value="">Seleccionar...</option>
                      {metadata.unidades.map((unit) => (
                        <option key={unit.id_unidad} value={unit.id_unidad}>
                          {unit.edificio} · {unit.codigo}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Tipo de problema <span className="mg-required">*</span></span>
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

                  <label className="mg-full-field">
                    <span>Título del problema <span className="mg-required">*</span></span>
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

                  <label className="mg-full-field">
                    <span>Descripción detallada <span className="mg-required">*</span></span>
                    <textarea
                      name="descripcion"
                      required
                      minLength={10}
                      maxLength={5000}
                      rows={4}
                      placeholder="Describe qué ocurre, dónde exactamente y desde cuándo se presenta..."
                      value={form.descripcion}
                      onChange={updateField}
                    />
                  </label>

                  <label className="mg-full-field">
                    <span>Adjuntos opcionales (Fotos o PDFs)</span>
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(event) =>
                        setFiles(Array.from(event.target.files || []))
                      }
                    />
                    <small>Hasta 3 archivos JPG, PNG o PDF de máximo 5 MB cada uno.</small>
                  </label>
                </div>

                {files.length > 0 && (
                  <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 12 }}>
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`}>{file.name}</li>
                    ))}
                  </ul>
                )}
              </fieldset>
            </div>

            <div className="mg-modal-actions">
              <button
                type="button"
                className="mg-secondary"
                disabled={busy}
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="mg-primary"
                disabled={busy || !canSubmit}
              >
                {busy ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}