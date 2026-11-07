/* Incidencias — F2-5a (shell + listado + filtros al kit), F2-5b (creación
 * en IncidentsCreateModal; cierra B8) y F2-5c (detalle en
 * IncidentsDetailModal). Listado: un solo useQuery con signal (misma
 * Promise.all y mismos endpoints por rol) con loading → Skeleton, error
 * → ErrorState con Reintentar y reload() que conserva datos previos
 * (sin titilar); PageHeader por rol con meta "N incidencias · M
 * abiertas" ("abierta" = estado que NO es de cierre: RESUELTA/CERRADA/
 * RECHAZADA/CANCELADA), FilterBar (SearchInput por título/tipo + Select
 * de estado desde el catálogo /statuses, sembrado desde params.estado
 * del hash —sin escribir de vuelta— y "Limpiar filtros") y DataTable SIN
 * columna #ID (id solo rowKey) con estados de StatusBadge (presets
 * reales), prioridad con override de MÓDULO (sin presets nuevos en el
 * kit), "Reportada" con formatDate y acciones RowActions ("Detalle"
 * quiet sm, aria-label con el título).
 * DETALLE (F2-5c): "Detalle" guarda la fila en `selected` y monta
 * `IncidentsDetailModal` con los catálogos YA cargados (prioridades/
 * statuses/insumos), rol, idUsuario y onChanged={reload}; el padre RETIRÓ
 * el estado y los fetch del detalle legado (detail/nextStatus/
 * statusComment/history/assignments/interventions/interventionResult,
 * openDetail/updatePriority/changeStatus/addIntervention, el Modal
 * legado y la Alert de página, ya sin consumidores: cada acción reporta
 * DENTRO del modal o por Toast). B7 (detalle) queda POR VERIFICAR con
 * captura del dueño. La asignación de técnico (ADMIN, columna Técnico)
 * queda inline igual: POST /assignments con Number, Toast de éxito/
 * error, busy local. Cero window.confirm.
 */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import { formatDate } from "../../utils/format";
import {
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
import { PRIORIDAD_TONO } from "./priorities";
import IncidentsCreateModal from "./IncidentsCreateModal";
import IncidentsDetailModal from "./IncidentsDetailModal";

/* Fallback del metadata QUE SOLO PIDE el residente (técnico/ADMIN no lo
 * consulta). */
const EMPTY_METADATA = { tipos: [], unidades: [] };

/* "Abiertas" = cualquier estado que NO marca cierre (criterio: RESUELTA,
 * CERRADA, RECHAZADA y CANCELADA NO cuentan como abiertas). */
const ESTADOS_CERRADOS = ["RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA"];

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
   * null para técnico/ADMIN; los modales reciben los catálogos vía props
   * (solo el residente consulta /metadata; técnico/ADMIN traen insumos). */
  const [incidents = [], priorities = [], statuses = [], metadatos = null, technicians = [], inventoryItems = []] = data || [];
  const metadata = metadatos ?? EMPTY_METADATA;

  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
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

  async function assign(row, event) {
    const id = event.target.value; if (!id) return; setBusy(true);
    try {
      await api(`${routes.incidents}/${row.id_incidencia}/assignments`, { method: "POST", body: { id_personal_asignado: Number(id) } });
      notify("Técnico asignado."); await reload();
    } catch (e) { notify(e.message || "No se pudo asignar el técnico.", { tone: "danger" }); } finally { setBusy(false); }
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
              onSelect: () => setSelected(row),
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
    {showCreate && (
      <IncidentsCreateModal
        open
        onClose={() => setShowCreate(false)}
        onCreated={reload}
        unidades={metadata.unidades}
        tipos={metadata.tipos}
      />
    )}
    {selected && (
      <IncidentsDetailModal
        incidencia={selected}
        rol={rol}
        idUsuario={user.id_usuario}
        prioridades={priorities}
        statuses={statuses}
        insumos={inventoryItems}
        onClose={() => setSelected(null)}
        onChanged={reload}
      />
    )}
  </section>;
}
