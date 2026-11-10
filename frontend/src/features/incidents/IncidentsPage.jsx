/* Listado de incidencias con filtros, asignación de técnicos y acceso a sus modales.
 * El filtro inicial se toma del hash; los datos se consultan según el rol. */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import { usePagination } from "../../hooks/usePagination";
import { formatDate } from "../../utils/format";
import { Button, DataTable, Field, FilterBar, PageHeader, Pagination, RowActions, SearchInput, Select, StatusBadge, useToast, } from "../../components/ui";
import { PRIORIDAD_TONO } from "./priorities";
import IncidentsCreateModal from "./IncidentsCreateModal";
import IncidentsDetailModal from "./IncidentsDetailModal";
import { useMutation } from "../../hooks/useMutation";

/* Fallback del metadata QUE SOLO PIDE el residente (técnico/ADMIN no lo
 * consulta). */
const EMPTY_METADATA = { tipos: [], unidades: [] };

/* "Abiertas" = cualquier estado que NO marca cierre (criterio: RESUELTA,
 * CERRADA, RECHAZADA y CANCELADA NO cuentan como abiertas). */
const ESTADOS_CERRADOS = ["RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA"];

export default function IncidentsPage({ user }) {
  const rol = user.rol;
  const isResident = rol === "RESIDENTE";
  const isTechnician = rol === "TECNICO";
  const isAdmin = rol === "ADMIN";
  const isManager = rol === "GESTOR";

  const puedeAsignar = isAdmin || isManager;
  const puedeConsultarInventario = isAdmin || isTechnician;

  const titulo = puedeAsignar
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
      puedeAsignar
        ? api(`${routes.incidents}/technicians`, { signal })
        : Promise.resolve([]),
      puedeConsultarInventario
        ? api(`${routes.maintenance}/insumos`, { signal })
        : Promise.resolve([]),
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
  const asignarTecnico = useMutation((incidentId, technicianId) =>
    api(`${routes.incidents}/${incidentId}/assignments`, {
      method: "POST",
      body: {
        id_personal_asignado: technicianId,
      },
    })
  );

  const busy = asignarTecnico.busy;
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
    const technicianId = Number(event.target.value);

    if (
      !puedeAsignar ||
      busy ||
      !Number.isInteger(technicianId) ||
      technicianId <= 0 ||
      technicianId === Number(row.id_personal_asignado)
    ) {
      return;
    }

    try {
      await asignarTecnico.run(row.id_incidencia, technicianId);
      notify("Técnico asignado.");
      await reload();
    } catch (error) {
      notify(error.message || "No se pudo asignar el técnico.", {
        tone: "danger",
      });
    }
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

  /* Paginación EN EL CLIENTE (F2-13b): filas YA filtradas; el resetKey
   * es la búsqueda + el filtro de estado serializados (el sembrado del
   * hash ?estado= también lo cambia → vuelve a la página 1). La meta del
   * PageHeader y el EmptyState siguen usando `incidents` (total). */
  const pag = usePagination(filtradas, { resetKey: `${busqueda}|${estadoFiltro}` });

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
    ...(puedeAsignar
      ? [
          {
            key: "tecnico",
            header: "Técnico",
            render: (row) => (
              <Select
                name={`tecnico_${row.id_incidencia}`}
                autoComplete="off"
                aria-label={`Asignar técnico a ${row.titulo}`}
                value={row.id_personal_asignado || ""}
                disabled={
                  busy ||
                  loading ||
                  !row.estado ||
                  ESTADOS_CERRADOS.includes(row.estado)
                }
                onChange={(event) => assign(row, event)}
              >
                <option value="">Seleccionar...</option>
                {technicians.map((technician) => (
                  <option
                    key={technician.id_usuario}
                    value={technician.id_usuario}
                  >
                    {[technician.nombre, technician.apellido]
                      .filter(Boolean)
                      .join(" ")}
                  </option>
                ))}
              </Select>
            ),
          },
        ]
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
      rows={pag.pageRows}
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
    <Pagination
      page={pag.page}
      pageCount={pag.pageCount}
      total={pag.total}
      from={pag.from}
      to={pag.to}
      onPrev={pag.goPrev}
      onNext={pag.goNext}
      label="Paginación de incidencias"
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
