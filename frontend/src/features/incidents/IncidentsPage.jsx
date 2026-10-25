/* Incidencias — F2-5a (checkpoint 1 de F2-5): shell + listado + filtros
 * migrados al kit. La CARGA ahora es un solo useQuery con signal (misma
 * Promise.all y mismos endpoints por rol del load() anterior) con loading
 * → Skeleton, error → ErrorState con Reintentar y reload() que conserva
 * datos previos (sin titilar). Listado: PageHeader por rol + meta de
 * conteo ("N incidencias · M abiertas", "abierta" = estado que NO es de
 * cierre: RESUELTA/CERRADA/RECHAZADA/CANCELADA), FilterBar (SearchInput
 * por título/tipo + Select de estado desde el catálogo /statuses, sembrado
 * desde params.estado del hash —sin escribir de vuelta— y "Limpiar
 * filtros") y DataTable SIN columna #ID (id solo rowKey) con estados de
 * StatusBadge (presets reales), prioridad con override de MÓDULO (sin
 * presets nuevos en el kit), "Reportada" con formatDate y acciones
 * RowActions ("Detalle" quiet sm, aria-label con el título).
 * Los MODALES de creación y detalle (formularios, cambio de estado,
 * intervenciones e InterventionMaterials de Dev 2) se CONSERVAN con su
 * código y comportamiento ACTUALES (solo se saca el aviso de página: el
 * éxito pasa a Toast); B8 (5b) y el defecto de B7 (5c) siguen abiertos.
 */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import { downloadAttachment } from "../../utils/downloadAttachment";
import { formatDate } from "../../utils/format";
import {
  Alert,
  Button,
  DataTable,
  Field,
  FilterBar,
  PageHeader,
  RowActions,
  SearchInput,
  Select,
  StatusBadge,
  useToast,
} from "../../components/ui";
import Modal from "../../components/ui/Modal";
import InterventionMaterials from "./InterventionMaterials";

const EMPTY_FORM = { titulo: "", descripcion: "", id_unidad: "", id_tipo_incidencia: "", archivos: [] };

/* Fallback del metadata QUE SOLO PIDE el residente (técnico/ADMIN no lo
 * consulta): el crear usa los modales y no existe en la pantalla. */
const EMPTY_METADATA = { tipos: [], unidades: [] };

/* "Abiertas" = cualquier estado que NO marca cierre (criterio: RESUELTA,
 * CERRADA, RECHAZADA y CANCELADA NO cuentan como abiertas). */
const ESTADOS_CERRADOS = ["RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA"];

/* Override de StatusBadge para prioridades (constante de módulo, MISMA
 * decisión que §8-bis: nada de presets nuevos en el kit). Baja muted/dot,
 * Normal neutral/dot, Alta warning/triangle, Urgente danger/diamond;
 * cualquier valor fuera del mapa cae en el default del kit neutral/dot
 * porque el spread queda vacío. */
const PRIORIDAD_TONO = {
  baja: { tone: "muted", glyph: "dot" },
  normal: { tone: "neutral", glyph: "dot" },
  alta: { tone: "warning", glyph: "triangle" },
  urgente: { tone: "danger", glyph: "diamond" },
};

export default function IncidentsPage({ user }) {
  const isResident = user.rol === "RESIDENTE";
  const isTechnician = user.rol === "TECNICO";
  const isAdmin = user.rol === "ADMIN";
  const rol = user.rol;
  const titulo = isAdmin
    ? "Gestión de incidencias"
    : isTechnician
      ? "Incidencias asignadas"
      : "Mis incidencias";

  const { params } = useHashRoute();
  const notify = useToast();

  /* Misma consulta que el load() anterior: un solo Promise.all con los
   * mismos endpoints por rol. loading inicial true (Skeleton, sin
   * "Reintentar" al abrir); reload() conserva datos previos. */
  const { data, loading, error: errorCarga, reload } = useQuery(async (signal) => {
    const [incidents, priorityRows, statusRows, incidentMetadata, technicianRows, inventoryRows] = await Promise.all([
      api(routes.incidents, { signal }),
      api(`${routes.incidents}/priorities`, { signal }),
      api(`${routes.incidents}/statuses`, { signal }),
      isResident ? api(`${routes.incidents}/metadata`, { signal }) : Promise.resolve(null),
      isAdmin ? api(`${routes.incidents}/technicians`, { signal }) : Promise.resolve([]),
      isResident ? Promise.resolve([]) : api(`${routes.maintenance}/insumos`, { signal }),
    ]);
    return [incidents ?? [], priorityRows ?? [], statusRows ?? [], incidentMetadata, technicianRows ?? [], inventoryRows ?? []];
  }, [user?.id_usuario, rol]);

  /* Defaults POR POSICIÓN: data es undefined en el primer render (no
   * repetir el bug de pantalla en blanco de Mis reservas). metadata queda
   * null para técnico/ADMIN; el modal de creación la usa con fallback. */
  const [incidents = [], priorities = [], statuses = [], metadatos = null, technicians = [], inventoryItems = []] = data || [];
  const metadata = metadatos ?? EMPTY_METADATA;

  const [detail, setDetail] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [interventionResult, setInterventionResult] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");

  /* Filtro de estado SEMBRADO desde el hash: se aplica cuando cambia
   * params.estado estando en la pantalla (enlaces del dashboard); valor
   * desconocido o falta de catálogo → sin filtro. NUNCA se escribe de
   * vuelta a la URL. */
  const nombresEstado = statuses.map((status) => status.nombre);
  const estadoDesdeUrl = typeof params.estado === "string" && nombresEstado.includes(params.estado) ? params.estado : "";
  useEffect(() => {
    setEstadoFiltro(estadoDesdeUrl);
  }, [estadoDesdeUrl]);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function createIncident(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = new FormData();
      ["titulo", "descripcion", "id_unidad", "id_tipo_incidencia"].forEach((key) => body.append(key, form[key]));
      form.archivos.forEach((file) => body.append("archivos", file));
      await api(routes.incidents, { method: "POST", body }); setForm({ ...EMPTY_FORM }); setShowCreate(false); notify("Incidencia creada."); await reload();
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
    try { const updated = await api(`${routes.incidents}/${detail.id_incidencia}/priority`, { method: "PATCH", body: { id_prioridad: Number(id) } }); setDetail(updated); await reload(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function changeStatus(event) {
    event.preventDefault();
    if (busy || !detail || !detail.estados_permitidos?.includes(nextStatus)) return;
    setBusy(true); setError("");
    try {
      const updated = await api(`${routes.incidents}/${detail.id_incidencia}/status`, {
        method: "PATCH",
        body: { estado: nextStatus, comentario: statusComment.trim() || null },
      });
      setDetail(updated); setNextStatus(""); setStatusComment("");
      setHistory(await api(`${routes.incidents}/${detail.id_incidencia}/history`));
      await reload();
      notify("Estado actualizado.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function assign(row, event) {
    const id = event.target.value; if (!id) return; setBusy(true);
    try {
      await api(`${routes.incidents}/${row.id_incidencia}/assignments`, { method: "POST", body: { id_personal_asignado: Number(id) } });
      notify("Técnico asignado."); await reload();
    } catch (e) { notify(e.message || "No se pudo asignar el técnico.", { tone: "danger" }); } finally { setBusy(false); }
  }

  async function addIntervention(event) {
    event.preventDefault(); if (!detail || !interventionResult.trim()) return; setBusy(true);
    try { await api(`${routes.incidents}/${detail.id_incidencia}/interventions`, { method: "POST", body: { resultado: interventionResult.trim() } }); setInterventionResult(""); setInterventions(await api(`${routes.incidents}/${detail.id_incidencia}/interventions`)); await reload(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const limpiarFiltros = () => {
    setBusqueda("");
    setEstadoFiltro("");
  };

  const triggerNuevo = isResident ? (
    <Button disabled={busy || loading} onClick={() => setShowCreate(true)}>
      Nueva incidencia
    </Button>
  ) : null;

  const hayIncidencias = incidents.length > 0;
  const abiertas = incidents.filter((row) => !ESTADOS_CERRADOS.includes(row.estado)).length;
  const meta = !loading && hayIncidencias
    ? `${incidents.length} ${incidents.length === 1 ? "incidencia" : "incidencias"} · ${abiertas} ${abiertas === 1 ? "abierta" : "abiertas"}`
    : undefined;

  const filtradas = incidents.filter((row) =>
    (estadoFiltro === "" || row.estado === estadoFiltro) &&
    (busqueda.trim() === "" ||
      [row.titulo, row.tipo_incidencia].some((valor) =>
        String(valor ?? "").toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
      ))
  );

  const columns = [
    { key: "titulo", header: "Título" },
    { key: "tipo", header: "Tipo", render: (row) => row.tipo_incidencia || "Sin tipo" },
    {
      key: "prioridad",
      header: "Prioridad",
      render: (row) => (
        <StatusBadge estado={row.prioridad} {...(PRIORIDAD_TONO[String(row.prioridad ?? "").trim().toLowerCase()] ?? {})} />
      ),
    },
    { key: "estado", header: "Estado", render: (row) => <StatusBadge estado={row.estado} /> },
    { key: "reportada", header: "Reportada", cellClassName: "ui-mono", render: (row) => formatDate(row.fecha_reporte) },
    ...(isAdmin
      ? [{
          key: "tecnico",
          header: "Técnico",
          render: (row) => (
            <Select
              aria-label={`Asignar técnico a ${row.titulo}`}
              value={row.id_personal_asignado || ""}
              disabled={busy}
              onChange={(event) => assign(row, event)}
            >
              <option value="">Seleccionar...</option>
              {technicians.map((t) => (
                <option key={t.id_usuario} value={t.id_usuario}>{t.nombre} {t.apellido}</option>
              ))}
            </Select>
          ),
        }]
      : []),
    {
      key: "acciones",
      header: "Acciones",
      width: "calc(var(--space-12) * 4)",
      render: (row) => (
        <RowActions
          actions={[
            {
              label: "Detalle",
              ariaLabel: `Ver detalle de la incidencia "${row.titulo}"`,
              onSelect: () => openDetail(row),
            },
          ]}
        />
      ),
    },
  ];

  return <section>
    <PageHeader
      title={titulo}
      meta={meta}
      actions={!loading && !hayIncidencias ? null : triggerNuevo}
    />
    {error && <Alert tone="danger" title="No se pudo completar la acción" onDismiss={() => setError("")}>{error}</Alert>}
    <FilterBar onReset={limpiarFiltros}>
      <SearchInput
        label={`Buscar en ${titulo.toLowerCase()}`}
        value={busqueda}
        onChange={setBusqueda}
        onClear={() => setBusqueda("")}
        placeholder="Buscar por título o tipo..."
      />
      <Field label="Estado">
        <Select name="estado" value={estadoFiltro} onChange={(event) => setEstadoFiltro(event.target.value)}>
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s.id_estado} value={s.nombre}>{s.nombre.replaceAll("_", " ")}</option>
          ))}
        </Select>
      </Field>
    </FilterBar>
    <DataTable
      columns={columns}
      rows={filtradas}
      rowKey={(row) => row.id_incidencia}
      caption={`Listado de ${titulo.toLowerCase()}`}
      loading={loading}
      error={errorCarga}
      onRetry={reload}
      emptyTitle={hayIncidencias ? "No hay incidencias que coincidan." : "No hay incidencias"}
      emptyDescription={hayIncidencias
        ? "Ajusta la búsqueda o limpia los filtros para ver resultados."
        : (isResident ? "Reporta la primera incidencia de tu unidad." : undefined)}
      emptyAction={!loading && hayIncidencias
        ? <Button variant="quiet" onClick={limpiarFiltros}>Limpiar filtros</Button>
        : (isResident ? triggerNuevo : undefined)}
    />
    {showCreate && <Modal title="Nueva incidencia" busy={busy} onClose={() => setShowCreate(false)}><form onSubmit={createIncident}><fieldset disabled={busy} className="mg-form-body"><label>Título<input name="titulo" required minLength={5} value={form.titulo} onChange={update} /></label><label>Descripción<textarea name="descripcion" required minLength={10} value={form.descripcion} onChange={update} /></label><label>Unidad<select name="id_unidad" required value={form.id_unidad} onChange={update}><option value="">Seleccionar...</option>{metadata.unidades.map((u) => <option key={u.id_unidad} value={u.id_unidad}>{u.edificio} · {u.codigo}</option>)}</select></label><label>Tipo<select name="id_tipo_incidencia" required value={form.id_tipo_incidencia} onChange={update}><option value="">Seleccionar...</option>{metadata.tipos.map((t) => <option key={t.id_tipo_incidencia} value={t.id_tipo_incidencia}>{t.nombre}</option>)}</select></label><p>La incidencia se registra con prioridad Normal. Administración puede ajustarla.</p><label>Evidencias<input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setForm((c) => ({ ...c, archivos: [...e.target.files] }))} /></label></fieldset><button className="mg-primary">Crear</button></form></Modal>}
    {detail && <Modal title={`Incidencia #${detail.id_incidencia}`} busy={busy} onClose={() => setDetail(null)}><div className="mg-form-body"><p><strong>{detail.titulo}</strong></p><p>{detail.descripcion}</p><p>Tipo: {detail.tipo_incidencia || "Sin tipo"}</p>{isAdmin && <label>Prioridad<select value={detail.id_prioridad} onChange={updatePriority}>{priorities.map((p) => <option key={p.id_prioridad} value={p.id_prioridad}>{p.nombre}</option>)}</select></label>}<p>Estado: {detail.estado}</p>{isTechnician && <form onSubmit={changeStatus}><fieldset disabled={busy}><label>Nuevo estado<select required value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}><option value="">Seleccionar...</option>{statuses.filter((s) => detail.estados_permitidos?.includes(s.nombre)).map((s) => <option key={s.id_estado} value={s.nombre}>{s.nombre.replaceAll("_", " ")}</option>)}</select></label><label>Comentario (opcional)<textarea maxLength={500} value={statusComment} onChange={(e) => setStatusComment(e.target.value)} /></label><button className="mg-primary" disabled={!nextStatus}>Guardar estado</button>{!detail.estados_permitidos?.length && <p>No hay cambios de estado disponibles.</p>}</fieldset></form>}{error && <div role="alert" className="mg-alert mg-alert-error">{error}</div>}<h3>Historial</h3><ul>{history.map((h) => <li key={h.id_historial_incidencia}>{h.fecha} · {h.estado}{h.comentario && ` · ${h.comentario}`}</li>)}</ul><h3>Asignaciones</h3><ul>{assignments.map((a) => <li key={a.id_asignacion}>{a.tecnico_nombre} {a.tecnico_apellido}</li>)}</ul><h3>Intervenciones</h3>{interventions.map((intervention) => <article className="detail-section" key={intervention.id_intervencion}><p>{intervention.fecha_inicio} · {intervention.resultado}</p><InterventionMaterials intervention={intervention} items={inventoryItems} canConsume={Boolean(detail.puede_registrar_intervencion && (isAdmin || (isTechnician && intervention.id_personal === user.id_usuario)))} onStockChanged={reload} /></article>)}{isTechnician && <form onSubmit={addIntervention}><textarea required minLength={5} value={interventionResult} onChange={(e) => setInterventionResult(e.target.value)} placeholder="Detalle de lo realizado" /><button className="mg-primary">Registrar intervención</button></form>}{detail.adjuntos?.map((file) => <button key={file.id_adjuntos_incidencia} className="mg-secondary" onClick={() => downloadAttachment(file.id_adjuntos_incidencia, file.nombre_original)}>Descargar {file.nombre_original}</button>)}</div></Modal>}
  </section>;
}
