import { useCallback, useEffect, useState } from "react";
import { api, downloadAttachment } from "../../services/api";
import { routes } from "../../services/routes";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";

const EMPTY_FORM = { titulo: "", descripcion: "", id_unidad: "", id_tipo_incidencia: "", archivos: [] };

export default function IncidentsPage({ user }) {
  const isResident = user.rol === "RESIDENTE";
  const isTechnician = user.rol === "TECNICO";
  const isAdmin = user.rol === "ADMIN";
  const [rows, setRows] = useState([]);
  const [metadata, setMetadata] = useState({ tipos: [], unidades: [] });
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [detail, setDetail] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [interventionResult, setInterventionResult] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [incidents, priorityRows, statusRows, incidentMetadata, technicianRows] = await Promise.all([
      api(routes.incidents),
      api(`${routes.incidents}/priorities`),
      api(`${routes.incidents}/statuses`),
      isResident ? api(`${routes.incidents}/metadata`) : Promise.resolve(null),
      isAdmin ? api(`${routes.incidents}/technicians`) : Promise.resolve([]),
    ]);
    setRows(incidents || []); setPriorities(priorityRows || []); setStatuses(statusRows || []);
    setTechnicians(technicianRows || []); if (incidentMetadata) setMetadata(incidentMetadata);
  }, [isResident, isAdmin]);

  useEffect(() => { let active = true; setLoading(true); load().catch((e) => active && setError(e.message)).finally(() => active && setLoading(false)); return () => { active = false; }; }, [load]);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function createIncident(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = new FormData();
      ["titulo", "descripcion", "id_unidad", "id_tipo_incidencia"].forEach((key) => body.append(key, form[key]));
      form.archivos.forEach((file) => body.append("archivos", file));
      await api(routes.incidents, { method: "POST", body }); setForm({ ...EMPTY_FORM }); setShowCreate(false); setNotice("Incidencia creada."); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function openDetail(row) {
    setNextStatus(""); setStatusComment("");
    setBusy(true); setError("");
    try {
      const [incident, historyRows, assignmentRows, interventionRows] = await Promise.all([
        api(`${routes.incidents}/${row.id_incidencia}`), api(`${routes.incidents}/${row.id_incidencia}/history`),
        isResident ? Promise.resolve([]) : api(`${routes.incidents}/${row.id_incidencia}/assignments`),
        api(`${routes.incidents}/${row.id_incidencia}/interventions`),
      ]);
      setDetail(incident); setHistory(historyRows || []); setAssignments(assignmentRows || []); setInterventions(interventionRows || []);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function updatePriority(event) {
    const id = event.target.value; if (!id || !detail) return; setBusy(true);
    try { const updated = await api(`${routes.incidents}/${detail.id_incidencia}/priority`, { method: "PATCH", body: { id_prioridad: Number(id) } }); setDetail(updated); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function changeStatus(event) {
    event.preventDefault();
    if (busy || !detail || !detail.estados_permitidos?.includes(nextStatus)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await api(`${routes.incidents}/${detail.id_incidencia}/status`, {
        method: "PATCH",
        body: { estado: nextStatus, comentario: statusComment.trim() || null },
      });
      setDetail(updated); setNextStatus(""); setStatusComment("");
      setHistory(await api(`${routes.incidents}/${detail.id_incidencia}/history`));
      await load();
      setNotice("Estado actualizado.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function assign(row, event) {
    const id = event.target.value; if (!id) return; setBusy(true);
    try { await api(`${routes.incidents}/${row.id_incidencia}/assignments`, { method: "POST", body: { id_personal_asignado: Number(id) } }); setNotice("Técnico asignado."); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function addIntervention(event) {
    event.preventDefault(); if (!detail || !interventionResult.trim()) return; setBusy(true);
    try { await api(`${routes.incidents}/${detail.id_incidencia}/interventions`, { method: "POST", body: { resultado: interventionResult.trim() } }); setInterventionResult(""); setInterventions(await api(`${routes.incidents}/${detail.id_incidencia}/interventions`)); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <section className="management-page"><div className="mg-page-heading"><div><p className="mg-eyebrow">GESTIÓN OPERATIVA</p><h1>{isAdmin ? "Gestión de incidencias" : isTechnician ? "Incidencias asignadas" : "Mis incidencias"}</h1><p>Consulta y gestiona el ciclo completo de las incidencias.</p></div>{isResident && <button className="mg-primary" onClick={() => setShowCreate(true)}><Icon name="plus" size={18} />Nueva incidencia</button>}</div>
    {error && <div className="mg-alert mg-alert-error">{error}</div>}{notice && <div className="mg-alert mg-alert-success">{notice}</div>}
    <div className="mg-panel">{loading ? <div className="mg-empty">Cargando...</div> : <div className="mg-table-scroll"><table className="mg-table"><thead><tr><th>ID</th><th>Título</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Detalle</th>{isAdmin && <th>Técnico</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id_incidencia}><td>#{row.id_incidencia}</td><td>{row.titulo}</td><td>{row.tipo_incidencia || "Sin tipo"}</td><td>{row.prioridad}</td><td>{row.estado}</td><td><button className="mg-secondary" onClick={() => openDetail(row)}>Ver detalle</button></td>{isAdmin && <td><select value={row.id_personal_asignado || ""} onChange={(e) => assign(row, e)}><option value="">Seleccionar...</option>{technicians.map((t) => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre} {t.apellido}</option>)}</select></td>}</tr>)}</tbody></table></div>}</div>
    {showCreate && <Modal title="Nueva incidencia" busy={busy} onClose={() => setShowCreate(false)}><form onSubmit={createIncident}><fieldset disabled={busy} className="mg-form-body"><label>Título<input name="titulo" required minLength={5} value={form.titulo} onChange={update} /></label><label>Descripción<textarea name="descripcion" required minLength={10} value={form.descripcion} onChange={update} /></label><label>Unidad<select name="id_unidad" required value={form.id_unidad} onChange={update}><option value="">Seleccionar...</option>{metadata.unidades.map((u) => <option key={u.id_unidad} value={u.id_unidad}>{u.edificio} · {u.codigo}</option>)}</select></label><label>Tipo<select name="id_tipo_incidencia" required value={form.id_tipo_incidencia} onChange={update}><option value="">Seleccionar...</option>{metadata.tipos.map((t) => <option key={t.id_tipo_incidencia} value={t.id_tipo_incidencia}>{t.nombre}</option>)}</select></label><p>La incidencia se registra con prioridad Normal. Administración puede ajustarla.</p><label>Evidencias<input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setForm((c) => ({ ...c, archivos: [...e.target.files] }))} /></label></fieldset><button className="mg-primary">Crear</button></form></Modal>}
    {detail && <Modal title={`Incidencia #${detail.id_incidencia}`} busy={busy} onClose={() => setDetail(null)}><div className="mg-form-body"><p><strong>{detail.titulo}</strong></p><p>{detail.descripcion}</p><p>Tipo: {detail.tipo_incidencia || "Sin tipo"}</p>{isAdmin && <label>Prioridad<select value={detail.id_prioridad} onChange={updatePriority}>{priorities.map((p) => <option key={p.id_prioridad} value={p.id_prioridad}>{p.nombre}</option>)}</select></label>}<p>Estado: {detail.estado}</p>{isTechnician && <form onSubmit={changeStatus}><fieldset disabled={busy}><label>Nuevo estado<select required value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}><option value="">Seleccionar...</option>{statuses.filter((s) => detail.estados_permitidos?.includes(s.nombre)).map((s) => <option key={s.id_estado} value={s.nombre}>{s.nombre.replaceAll("_", " ")}</option>)}</select></label><label>Comentario (opcional)<textarea maxLength={500} value={statusComment} onChange={(e) => setStatusComment(e.target.value)} /></label><button className="mg-primary" disabled={!nextStatus}>Guardar estado</button>{!detail.estados_permitidos?.length && <p>No hay cambios de estado disponibles.</p>}</fieldset></form>}{error && <div role="alert" className="mg-alert mg-alert-error">{error}</div>}<h3>Historial</h3><ul>{history.map((h) => <li key={h.id_historial_incidencia}>{h.fecha} · {h.estado}{h.comentario && ` · ${h.comentario}`}</li>)}</ul><h3>Asignaciones</h3><ul>{assignments.map((a) => <li key={a.id_asignacion}>{a.tecnico_nombre} {a.tecnico_apellido}</li>)}</ul><h3>Intervenciones</h3><ul>{interventions.map((i) => <li key={i.id_intervencion}>{i.fecha_inicio} · {i.resultado}</li>)}</ul>{isTechnician && <form onSubmit={addIntervention}><textarea required minLength={5} value={interventionResult} onChange={(e) => setInterventionResult(e.target.value)} placeholder="Detalle de lo realizado" /><button className="mg-primary">Registrar intervención</button></form>}{detail.adjuntos?.map((file) => <button key={file.id_adjuntos_incidencia} className="mg-secondary" onClick={() => downloadAttachment(file.id_adjuntos_incidencia, file.nombre_original)}>Descargar {file.nombre_original}</button>)}</div></Modal>}
  </section>;
}
