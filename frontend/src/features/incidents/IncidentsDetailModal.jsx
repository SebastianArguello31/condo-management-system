/* IncidentsDetailModal — F2-5c: modal de DETALLE de incidencias al kit
 * (bug B7 por verificar; NO se declara cerrado sin captura del dueño).
 * Paridad con el detalle legado de IncidentsPage: un solo useQuery con
 * signal (GET /incidents/:id + /history + /assignments SOLO técnico/ADMIN
 * + /interventions, mismas condiciones por rol), loading → Skeleton,
 * error → ErrorState con Reintentar y defaults POR POSICIÓN. Skeleton y
 * ErrorState solo aparecen SIN datos: durante los reload posteriores a
 * una acción el contenido se CONSERVA montado (useQuery conserva datos
 * previos), para no re-fetchear los consumos de cada InterventionMaterials
 * ni perder el foco de los formularios. Acciones
 * con misma endpoints/payloads: PATCH /priority ({id_prioridad} number,
 * ADMIN), PATCH /status ({estado, comentario|null} ≤500, TÉCNICO, solo
 * estados_permitidos) y POST /interventions ({resultado} min 5, TÉCNICO).
 * Cada acción con su propio useMutation (dedupe)/busy y su error DENTRO
 * del modal (Alert por sección); éxito SIEMPRE por Toast y recarga del
 * detalle + onChanged (reload del listado sin titilar); el modal NO se
 * cierra por una acción y su footer solo trae "Cerrar".
 * `<InterventionMaterials>` (Dev 2) se usa SIN CAMBIOS, con las mismas
 * props y `onStockChanged={onChanged}` que el legado.
 */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { downloadAttachment } from "../../utils/downloadAttachment";
import { formatDate, formatDateTime } from "../../utils/format";
import { validate, incidenciaPrioridad, intervencionCrear, requerido, maximo } from "../../validations";
import {
  Alert,
  Button,
  DefinitionList,
  ErrorState,
  Field,
  Modal,
  Timeline,
  Select,
  Skeleton,
  StatusBadge,
  STATUS_PRESETS,
  normalizeStatus,
  Textarea,
  useToast,
} from "../../components/ui";
import InterventionMaterials from "./InterventionMaterials";
import { PRIORIDAD_TONO } from "./priorities";

/* Schema local del cambio de estado (espejo del backend rules.py — no
 * existe en validations/schemas.js porque el endpoint no es de creación). */
const ESTADO_SCHEMA = {
  estado: [requerido()],
  comentario: [maximo(500)],
};

/* Titulares de sección (h3): el <h2> es SOLO el del Modal (a11y; el
 * Section del kit renderiza h2, por eso no se usa DENTRO del modal). */
const TITULO_SECCION = {
  margin: "var(--space-6) 0 var(--space-3)",
  fontSize: "var(--fs-16)",
  lineHeight: "var(--lh-16)",
  color: "var(--ink)",
  fontWeight: 600,
};

/* Regla de 1px entre la lista de intervenciones y su formulario. */
const SEPARADOR = {
  border: "none",
  borderTop: "1px solid var(--line)",
  margin: "var(--space-4) 0",
};

/* err.errors del backend trae ARRAYS por campo → string por campo. */
function normalizarErrores(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensajes]) => [
      campo,
      Array.isArray(mensajes) ? (mensajes[0] ?? "") : String(mensajes),
    ])
  );
}

export default function IncidentsDetailModal({
  incidencia,
  rol,
  idUsuario,
  prioridades = [],
  statuses = [],
  insumos = [],
  onClose,
  onChanged,
}) {
  const isResident = rol === "RESIDENTE";
  const isTechnician = rol === "TECNICO";
  const isAdmin = rol === "ADMIN";
  const notify = useToast();
  const id = incidencia.id_incidencia;

  const { data, loading, error: errorCarga, reload } = useQuery(async (signal) => {
    const [incidente, historyRows, assignmentRows, interventionRows] = await Promise.all([
      api(`${routes.incidents}/${id}`, { signal }),
      api(`${routes.incidents}/${id}/history`, { signal }),
      isResident ? Promise.resolve([]) : api(`${routes.incidents}/${id}/assignments`, { signal }),
      api(`${routes.incidents}/${id}/interventions`, { signal }),
    ]);
    return [incidente, historyRows, assignmentRows, interventionRows];
  }, [id, rol]);

  /* Defaults POR POSICIÓN (data undefined en el primer render). */
  const [detail, historial = [], asignaciones = [], intervenciones = []] = data ?? [];

  /* --- Acción ADMIN: prioridad (PATCH /priority, {id_prioridad} number) --- */
  const [prioridadForm, setPrioridadForm] = useState({ id_prioridad: "" });
  const [prioridadErr, setPrioridadErr] = useState({});
  const [prioridadError, setPrioridadError] = useState("");
  /* El select se RE-SINCRONIZA desde el detalle cargado/recargado (los
   * reload() ocurren solo tras guardar, nunca mientras se edita). */
  useEffect(() => {
    if (detail) setPrioridadForm({ id_prioridad: String(detail.id_prioridad ?? "") });
  }, [detail]);
  const guardarPrioridad = useMutation((body) =>
    api(`${routes.incidents}/${id}/priority`, { method: "PATCH", body })
  );

  /* --- Acción TÉCNICO: estado (PATCH /status, comentario ≤500) --- */
  const [estadoForm, setEstadoForm] = useState({ estado: "", comentario: "" });
  const [estadoErr, setEstadoErr] = useState({});
  const [estadoError, setEstadoError] = useState("");
  const cambiarEstado = useMutation((body) =>
    api(`${routes.incidents}/${id}/status`, { method: "PATCH", body })
  );

  /* --- Acción TÉCNICO: intervención (POST /interventions, min 5) --- */
  const [intervencionForm, setIntervencionForm] = useState({ resultado: "" });
  const [intervencionErr, setIntervencionErr] = useState({});
  const [intervencionError, setIntervencionError] = useState("");
  const registrarIntervencion = useMutation((body) =>
    api(`${routes.incidents}/${id}/interventions`, { method: "POST", body })
  );

  /* --- Descarga de adjuntos: el error vive DENTRO del modal --- */
  const [descargaError, setDescargaError] = useState("");
  /* Recarga del detalle + refresh del listado del padre (sin titilar). */
  async function recargarTodo() {
    await reload();
    await onChanged?.();
  }

  async function submitPrioridad(event) {
    event.preventDefault();
    if (guardarPrioridad.busy) return;
    setPrioridadError("");
    const errores = validate(prioridadForm, incidenciaPrioridad);
    setPrioridadErr(errores);
    if (Object.keys(errores).length) return;
    setPrioridadErr({});
    try {
      await guardarPrioridad.run({ id_prioridad: Number(prioridadForm.id_prioridad) });
      notify("Prioridad actualizada.");
      await recargarTodo();
    } catch (err) {
      setPrioridadError(err?.message ?? "No se pudo actualizar la prioridad.");
      if (err?.errors) setPrioridadErr(normalizarErrores(err.errors));
    }
  }

  async function submitEstado(event) {
    event.preventDefault();
    if (cambiarEstado.busy) return;
    setEstadoError("");
    const errores = validate(estadoForm, ESTADO_SCHEMA);
    setEstadoErr(errores);
    if (Object.keys(errores).length) return;
    setEstadoErr({});
    try {
      await cambiarEstado.run({
        estado: estadoForm.estado,
        comentario: estadoForm.comentario.trim() || null,
      });
      notify("Estado actualizado.");
      setEstadoForm({ estado: "", comentario: "" });
      await recargarTodo();
    } catch (err) {
      setEstadoError(err?.message ?? "No se pudo actualizar el estado.");
      if (err?.errors) setEstadoErr(normalizarErrores(err.errors));
    }
  }

  async function submitIntervencion(event) {
    event.preventDefault();
    if (registrarIntervencion.busy) return;
    setIntervencionError("");
    const errores = validate(intervencionForm, intervencionCrear);
    setIntervencionErr(errores);
    if (Object.keys(errores).length) return;
    setIntervencionErr({});
    try {
      await registrarIntervencion.run({ resultado: intervencionForm.resultado.trim() });
      notify("Intervención registrada.");
      setIntervencionForm({ resultado: "" });
      await recargarTodo();
    } catch (err) {
      setIntervencionError(err?.message ?? "No se pudo registrar la intervención.");
      if (err?.errors) setIntervencionErr(normalizarErrores(err.errors));
    }
  }

  async function descargar(file) {
    setDescargaError("");
    try {
      await downloadAttachment(file.id_adjuntos_incidencia, file.nombre_original);
    } catch (err) {
      setDescargaError(err?.message ?? "No se pudo descargar el archivo.");
    }
  }

  const updatePrioridad = (event) => {
    const value = event.target.value;
    setPrioridadForm({ id_prioridad: value });
    setPrioridadErr((current) => (current.id_prioridad
      ? { ...current, id_prioridad: undefined }
      : current));
  };

  const updateEstado = (name) => (event) => {
    const value = event.target.value;
    setEstadoForm((current) => ({ ...current, [name]: value }));
    setEstadoErr((current) => (current[name]
      ? { ...current, [name]: undefined }
      : current));
  };

  const updateIntervencion = (event) => {
    setIntervencionForm({ resultado: event.target.value });
    setIntervencionErr((current) => (current.resultado
      ? { ...current, resultado: undefined }
      : current));
  };

  const estadosPermitidos = (detail?.estados_permitidos ?? [])
    .map((nombre) => statuses.find((s) => s.nombre === nombre))
    .filter(Boolean);
  const adjuntos = detail?.adjuntos ?? [];
  /* Edificio y unidad llegan como NOMBRE/código en el payload del
   * detalle (INCIDENT_SELECT del backend usado por list y get: `u.codigo
   * AS unidad`, `e.nombre AS edificio`); si el detalle no los trajera,
   * respaldo en la FILA del listado (misma SELECT). Si no hay dato en
   * ninguno de los dos, la fila se OMITE del DefinitionList (sin guiones
   * ni "undefined"). Resumen igual para RESIDENTE/TECNICO/ADMIN. */
  const edificio = detail?.edificio ?? incidencia.edificio;
  const unidad = detail?.unidad ?? incidencia.unidad;

  return (
    <Modal
      title={`Incidencia #${id}`}
      busy={guardarPrioridad.busy || cambiarEstado.busy || registrarIntervencion.busy}
      onClose={onClose}
      footer={<Button variant="quiet" onClick={onClose}>Cerrar</Button>}
    >
      {loading && !detail && <Skeleton lines={8} />}

      {!loading && errorCarga && !detail && (
        <ErrorState
          title="No se pudo cargar el detalle"
          description={errorCarga.message}
          onRetry={() => reload()}
        />
      )}

      {detail && (
        <>
          <h3 style={{ ...TITULO_SECCION, margin: "0 0 var(--space-3)" }}>Resumen</h3>
          <DefinitionList
            items={[
              { term: "Estado", detail: <StatusBadge estado={detail.estado} /> },
              {
                term: "Prioridad",
                detail: (
                  <StatusBadge
                    estado={detail.prioridad}
                    {...(PRIORIDAD_TONO[String(detail.prioridad ?? "").trim().toLowerCase()] ?? {})}
                  />
                ),
              },
              { term: "Tipo", detail: detail.tipo_incidencia || "Sin tipo" },
              { term: "Título", detail: detail.titulo },
              { term: "Descripción", detail: detail.descripcion },
              { term: "Fecha de reporte", detail: formatDate(detail.fecha_reporte) },
              ...(detail.fecha_limite
                ? [{ term: "Fecha límite", detail: formatDate(detail.fecha_limite) }]
                : []),
              ...(detail.residente_nombre
                ? [{ term: "Reportante", detail: `${detail.residente_nombre} ${detail.residente_apellido}` }]
                : []),
              ...(edificio ? [{ term: "Edificio", detail: edificio }] : []),
              ...(unidad ? [{ term: "Unidad", detail: unidad }] : []),
            ]}
          />

          {adjuntos.length > 0 && (
            <>
              <h3 style={TITULO_SECCION}>Adjuntos</h3>
              <Alert
                tone="danger"
                visible={Boolean(descargaError)}
                title="No se pudo descargar el adjunto"
                onDismiss={() => setDescargaError("")}
              >
                {descargaError}
              </Alert>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {adjuntos.map((file) => (
                  <li
                    key={file.id_adjuntos_incidencia}
                    style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", paddingBlock: "var(--space-2)" }}
                  >
                    <span>{file.nombre_original}</span>
                    <Button
                      variant="quiet"
                      size="sm"
                      aria-label={`Descargar ${file.nombre_original}`}
                      onClick={() => descargar(file)}
                    >
                      Descargar
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!isResident && isAdmin && (
            <>
              <h3 style={TITULO_SECCION}>Prioridad</h3>
              <Alert
                tone="danger"
                visible={Boolean(prioridadError)}
                title="No se pudo actualizar la prioridad"
                onDismiss={() => setPrioridadError("")}
              >
                {prioridadError}
              </Alert>
              <form onSubmit={submitPrioridad} noValidate>
                <div className="ui-form-stack">
                  <Field label="Nueva prioridad" error={prioridadErr.id_prioridad}>
                    <Select
                      name="id_prioridad"
                      autoComplete="off"
                      value={prioridadForm.id_prioridad}
                      onChange={updatePrioridad}
                    >
                      {prioridades.map((p) => (
                        <option key={p.id_prioridad} value={p.id_prioridad}>{p.nombre}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="ui-form-actions">
                  <Button type="submit" busy={guardarPrioridad.busy}>
                    Guardar prioridad
                  </Button>
                </div>
              </form>
            </>
          )}

          {isTechnician && (
            <>
              <h3 style={TITULO_SECCION}>Cambiar estado</h3>
              <Alert
                tone="danger"
                visible={Boolean(estadoError)}
                title="No se pudo actualizar el estado"
                onDismiss={() => setEstadoError("")}
              >
                {estadoError}
              </Alert>
              <form onSubmit={submitEstado} noValidate>
                <div className="ui-form-stack">
                  <Field label="Nuevo estado" required error={estadoErr.estado}>
                    <Select
                      name="estado"
                      autoComplete="off"
                      value={estadoForm.estado}
                      onChange={updateEstado("estado")}
                    >
                      <option value="">Seleccionar...</option>
                      {estadosPermitidos.map((s) => (
                        <option key={s.id_estado} value={s.nombre}>{s.nombre.replaceAll("_", " ")}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Comentario"
                    help="Opcional, hasta 500 caracteres."
                    error={estadoErr.comentario}
                  >
                    <Textarea
                      name="comentario"
                      autoComplete="off"
                      maxLength={500}
                      rows={3}
                      value={estadoForm.comentario}
                      onChange={updateEstado("comentario")}
                    />
                  </Field>
                </div>
                <div className="ui-form-actions">
                  <Button type="submit" busy={cambiarEstado.busy}>
                    Actualizar estado
                  </Button>
                </div>
                {!detail.estados_permitidos?.length && (
                  <p style={{ margin: "var(--space-3) 0 0", color: "var(--ink-2)" }}>
                    No hay cambios de estado disponibles.
                  </p>
                )}
              </form>
            </>
          )}

          <h3 style={TITULO_SECCION}>Historial</h3>
          {historial.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ink-2)" }}>Sin movimientos registrados.</p>
          ) : (
            /* Timeline del kit: fecha/hora formateada, estado+autor como
             * meta y comentario como detail; tone derivado del PRESET de
             * StatusBadge (info/success/warning/danger; muted/neutral →
             * marcador neutro). */
            <Timeline
              entries={historial.map((h) => {
                const tone = STATUS_PRESETS[normalizeStatus(h.estado)]?.tone;
                return {
                  id: h.id_historial_incidencia,
                  time: formatDateTime(h.fecha),
                  title: h.estado?.replaceAll("_", " ") ?? "Sin estado",
                  meta: `${h.usuario_nombre} ${h.usuario_apellido}`,
                  detail: h.comentario || undefined,
                  tone: ["info", "success", "warning", "danger"].includes(tone) ? tone : undefined,
                };
              })}
            />
          )}

          {!isResident && (
            <>
              <h3 style={TITULO_SECCION}>Asignaciones</h3>
              {asignaciones.length === 0 ? (
                <p style={{ margin: 0, color: "var(--ink-2)" }}>Sin asignaciones registradas.</p>
              ) : (
                <DefinitionList
                  items={asignaciones.map((a) => ({
                    term: `Asignación ${formatDate(a.fecha_asignacion)}`,
                    detail: `${a.tecnico_nombre} ${a.tecnico_apellido}`,
                  }))}
                />
              )}
            </>
          )}

          <h3 style={TITULO_SECCION}>Intervenciones</h3>
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            {intervenciones.length === 0 && (
              <p style={{ margin: 0, color: "var(--ink-2)" }}>Sin intervenciones registradas.</p>
            )}
            {intervenciones.map((intervention) => (
              <article key={intervention.id_intervencion}>
                <p style={{ margin: 0, fontWeight: 600 }}>{formatDateTime(intervention.fecha_inicio)}</p>
                <p style={{ margin: "var(--space-1) 0 0" }}>{intervention.resultado}</p>
                {/* InterventionMaterials legado intacto: el margen va en
                 * ESTE contenedor (tokens), sin editar su archivo. */}
                <div style={{ marginTop: "var(--space-4)" }}>
                  <InterventionMaterials
                    intervention={intervention}
                    items={insumos}
                    canConsume={Boolean(
                      detail.puede_registrar_intervencion &&
                        (isAdmin || (isTechnician && intervention.id_personal === idUsuario))
                    )}
                    onStockChanged={onChanged}
                  />
                </div>
              </article>
            ))}
          </div>

          {isTechnician && (
            <>
              <hr style={SEPARADOR} />
              <h3 style={{ ...TITULO_SECCION, margin: "0 0 var(--space-3)" }}>Registrar intervención</h3>
              <Alert
                tone="danger"
                visible={Boolean(intervencionError)}
                title="No se pudo registrar la intervención"
                onDismiss={() => setIntervencionError("")}
              >
                {intervencionError}
              </Alert>
              <form onSubmit={submitIntervencion} noValidate>
                <div className="ui-form-stack">
                  <Field label="Detalle de lo realizado" required error={intervencionErr.resultado}>
                    <Textarea
                      name="resultado"
                      autoComplete="off"
                      rows={3}
                      value={intervencionForm.resultado}
                      onChange={updateIntervencion}
                    />
                  </Field>
                </div>
                <div className="ui-form-actions">
                  <Button type="submit" busy={registrarIntervencion.busy}>
                    Registrar intervención
                  </Button>
                </div>
              </form>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
