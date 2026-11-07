/* GestionReservasPage — F2-8a: Gestión de reservas (ADMIN) al kit.
 * Reemplaza el shell legado (mg-* / status-badge CSS). Paridad con el
 * legado: listado GET /reservations con los MISMOS filtros de SERVIDOR
 * (espacio, estado, fecha, residente; valores vacíos omitidos) y acciones
 * PATCH /reservations/:id/status { estado: CONFIRMADA | RECHAZADA |
 * CANCELADA }: "Aprobar" y "Rechazar" SOLO con PENDIENTE, "Cancelar" con
 * PENDIENTE/CONFIRMADA (= reservas/rules.py).
 * Cambios por convención (§8-bis) y decisiones del dueño (§ "Sesión F2-8"):
 * meta de conteo en PageHeader sin eyebrow (español neutro, sin voseo);
 * useQuery con signal por SEPARADO para catálogos (espacios + residentes,
 * deps []) y listado (deps [consulta]: cada cambio de filtro aborta la
 * búsqueda en vuelo — sin carreras); ErrorState con Reintentar /
 * Skeleton sin parpadeo / EmptyState DISTINTO para "sin resultados por
 * filtro" (con "Limpiar filtros") y "sin reservas"; columnas SIN ID,
 * Fecha con formatDate, Personas alineación right, Estado con StatusBadge
 * (presets reales, sin overrides); acciones con RowActions visibles
 * (Aprobar quiet sm / Rechazar y Cancelar danger-ghost sm, aria-label con
 * residente, espacio y fecha SIN "#id"), confirmaciones con useConfirm
 * (danger en Rechazar y Cancelar) + useMutation con dedupe + Toast (error
 * por Toast danger); filtro de estado sembrado desde params.estado del
 * hash (#/gestion/reservas?estado=…) reaccionando al cambio SIN escribir
 * de vuelta; cero window.confirm.
 */
import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { useConfirm } from "../../hooks/useConfirm";
import { formatDate, formatTime } from "../../utils/format";
import {
  Button,
  DataTable,
  Field,
  FilterBar,
  Input,
  PageHeader,
  RowActions,
  Select,
  StatusBadge,
  useToast,
  ErrorState,
} from "../../components/ui";


const DESCRIPCION =
  "Revisa todas las reservas del condominio y gestiona su aprobación, rechazo o cancelación.";

/* Los 5 estados REALES del catálogo estado_reservas (database/seed.sql),
 * como los pinta el backend; no hay endpoint de catálogo de estados de
 * reserva (constante de módulo, decisión 5 del análisis). */
const ESTADOS = ["PENDIENTE", "CONFIRMADA", "RECHAZADA", "CANCELADA", "FINALIZADA"];

/* Estados desde los que el residente puede cancelar (paridad del legado
 * y de reservas/rules.py + Mis reservas). */
const ESTADOS_CANCELABLES = ["PENDIENTE", "CONFIRMADA"];

/* Textos por estado destino (confirmación + Toast), sin "#id" en los
 * mensajes (paridad de los mensajes del legado sin su formato). */
const CONFIRMACION = {
  CONFIRMADA: {
    title: "Aprobar reserva",
    confirmLabel: "Aprobar",
    danger: false,
    toast: "Reserva aprobada.",
  },
  RECHAZADA: {
    title: "Rechazar reserva",
    confirmLabel: "Rechazar",
    danger: true,
    toast: "Reserva rechazada.",
  },
  CANCELADA: {
    title: "Cancelar reserva",
    confirmLabel: "Sí, cancelar reserva",
    danger: true,
    toast: "Reserva cancelada.",
  },
};

const EMPTY_FILTERS = { espacio: "", estado: "", fecha: "", residente: "" };

/* El listado de reservas trae residente_nombre/residente_apellido. */
const nombreCompleto = (row) =>
  [row?.residente_nombre, row?.residente_apellido].filter(Boolean).join(" ") || "—";

export default function GestionReservasPage({ user }) {
  const isAdmin = user?.rol === "ADMIN";
  const isManager = user?.rol === "GESTOR";
  const puedeAprobar = isAdmin || isManager;
  const notify = useToast();
  const confirmar = useConfirm();
  const { params } = useHashRoute();

  /* Catálogos en una consulta separada con deps []: NO se repite al
   * cambiar un filtro (la dep de recarga es solo `consulta`). */
  const {
    data: catalogos,
    error: errorCatalogos,
    reload: recargarCatalogos,
  } = useQuery(async (signal) => {
    const [espacios, residentes] = await Promise.all([
      api(routes.commonSpaces, { signal }),
      isAdmin
        ? api(routes.residents, { signal })
        : Promise.resolve([]),
    ]);

    return [espacios ?? [], residentes ?? []];
  }, [user?.id_usuario, isAdmin]);

  const [espacios = [], residentes = []] = catalogos || [];

  const [filtros, setFiltros] = useState({ ...EMPTY_FILTERS });

  /* Filtro de estado SEMBRADO desde el hash (decisión 3): reacciona si
   * cambia params.estado estando en la pantalla (enlaces del dashboard);
   * valor desconocido → sin filtro. NUNCA se escribe de vuelta a la URL
   * (mismo patrón de IncidentsPage). */
  const estadoDesdeUrl =
    typeof params.estado === "string" && ESTADOS.includes(params.estado)
      ? params.estado
      : "";
  useEffect(() => {
    setFiltros((prev) => ({ ...prev, estado: estadoDesdeUrl }));
  }, [estadoDesdeUrl]);

  function actualizarFiltro(event) {
    const { name, value } = event.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }

  const limpiarFiltros = () => setFiltros({ ...EMPTY_FILTERS });

  /* Query string de SERVIDOR con los valores vacíos omitidos (paridad del
   * load() del legado); la dep es la string ya construida. */
  const consulta = useMemo(() => {
    const queryParams = new URLSearchParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor !== "") queryParams.set(clave, valor);
    });
    return queryParams.toString();
  }, [filtros]);

  /* Listado con filtros de servidor: cada cambio re-consulta con signal
   * (useQuery aborta la consulta en vuelo y descarta datos de deps
   * viejas). */
  const { data, loading, error, reload } = useQuery(
    (signal) =>
      api(`${routes.reservations}${consulta ? `?${consulta}` : ""}`, { signal }),
    [consulta]
  );
  const rows = data ?? [];

  /* Residente como Select (decisión 2): deduplicado por usuario
   * conservando la PRIMERA fila (los GET /residents llegan ordenados por
   * apellido y nombre, mismo criterio del dedicado de ResidentsPage). */
  const residentesUnicos = useMemo(() => {
    const grupos = new Map();
    residentes.forEach((fila) => {
      if (!grupos.has(fila.id_usuario)) grupos.set(fila.id_usuario, fila);
    });
    return [...grupos.values()];
  }, [residentes]);

  const cambiarEstado = useMutation((id, estado) =>
    api(`${routes.reservations}/${id}/status`, { method: "PATCH", body: { estado } })
  );

  async function pedirCambio(row, estado) {
    if (cambiarEstado.busy) return;
    if (!puedeAprobar) return;
    if (!isAdmin && estado !== "CONFIRMADA") return;
    const textos = CONFIRMACION[estado];
    const ok = await confirmar({
      title: textos.title,
      message: `La reserva de ${nombreCompleto(row)} en ${row.espacio} del ${formatDate(row.fecha)} quedará ${estado}.${
        estado === "CANCELADA" ? " No hay vuelta atrás." : ""
      }`,
      confirmLabel: textos.confirmLabel,
      danger: textos.danger,
    });
    if (!ok) return;
    try {
      await cambiarEstado.run(row.id_reserva, estado);
      notify(textos.toast);
      await reload();
    } catch (err) {
      notify(err.message || "No se pudo actualizar la reserva.", {
        tone: "danger",
      });
    }
  }

  const pendientes = rows.filter((row) => row.estado === "PENDIENTE").length;
  const conteo = loading
    ? undefined
    : rows.length > 0
      ? `${rows.length} ${rows.length === 1 ? "reserva" : "reservas"} · ${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}`
      : undefined;
  const descripcion = isAdmin
    ? DESCRIPCION
    : "Revisa las solicitudes y aprueba las reservas pendientes.";
  const meta = [descripcion, conteo].filter(Boolean).join(" · ") || undefined;

  const hayFiltros = consulta !== "";

  const columns = [
    {
      key: "fecha",
      header: "Fecha",
      cellClassName: "ui-mono",
      align: "right",
      render: (row) => formatDate(row.fecha),
    },
    { key: "espacio", header: "Espacio", render: (row) => row.espacio },
    { key: "residente", header: "Residente", render: (row) => nombreCompleto(row) },
    { key: "tipo_evento", header: "Tipo de evento" },
    {
      key: "horario",
      header: "Horario",
      align: "right",
      cellClassName: "ui-mono",
      render: (row) =>
        [
          formatTime(`${row.fecha}T${row.hora_inicio}`),
          formatTime(`${row.fecha}T${row.hora_fin}`),
        ].join(" - "),
    },
    { key: "personas", header: "Personas", align: "right", render: (row) => row.cantidad_personas },
    { key: "estado", header: "Estado", render: (row) => <StatusBadge estado={row.estado} /> },
    {
      key: "acciones",
      header: "Acciones",
      width: isAdmin
        ? "calc(var(--space-12) * 5)"
        : "calc(var(--space-12) * 4)",
      render: (row) => (
        <RowActions
          actions={[
            ...(puedeAprobar && row.estado === "PENDIENTE"
              ? [
                  {
                    label: "Aprobar",
                    ariaLabel: `Aprobar la reserva de ${nombreCompleto(row)} en ${row.espacio} del ${formatDate(row.fecha)}`,
                    disabled: cambiarEstado.busy,
                    onSelect: () => pedirCambio(row, "CONFIRMADA"),
                  },
                ]
              : []),
            ...(isAdmin && row.estado === "PENDIENTE"
              ? [
                  {
                    label: "Rechazar",
                    danger: true,
                    ariaLabel: `Rechazar la reserva de ${nombreCompleto(row)} en ${row.espacio} del ${formatDate(row.fecha)}`,
                    disabled: cambiarEstado.busy,
                    onSelect: () => pedirCambio(row, "RECHAZADA"),
                  },
                ]
              : []),
            ...(isAdmin && ESTADOS_CANCELABLES.includes(row.estado)
              ? [
                  {
                    label: "Cancelar",
                    danger: true,
                    ariaLabel: `Cancelar la reserva de ${nombreCompleto(row)} en ${row.espacio} del ${formatDate(row.fecha)}`,
                    disabled: cambiarEstado.busy,
                    onSelect: () => pedirCambio(row, "CANCELADA"),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <section>
      <PageHeader title="Gestión de reservas" meta={meta} />
        {errorCatalogos && (
          <ErrorState
            title="No se pudieron cargar los filtros"
            description={errorCatalogos.message}
            onRetry={recargarCatalogos}
          />
        )}

      <FilterBar onReset={limpiarFiltros}>
        <Field
          label="Espacio"
          help={espacios.length === 0 ? "Aún no hay espacios comunes registrados." : undefined}
        >
          <Select name="espacio" value={filtros.espacio} onChange={actualizarFiltro}>
            <option value="">Todos los espacios</option>
            {espacios.map((espacio) => (
              <option key={espacio.id_espacio_comun} value={espacio.id_espacio_comun}>
                {espacio.nombre}
              </option>
            ))}
          </Select>
        </Field>
        {/* Constante de módulo: siempre las 5 opciones, sin esperar al
         * catálogo (también permite sembrar desde el hash al abrir). */}
        <Field label="Estado">
          <Select name="estado" value={filtros.estado} onChange={actualizarFiltro}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha">
          <Input type="date" name="fecha" value={filtros.fecha} onChange={actualizarFiltro} />
        </Field>
        {isAdmin && (
          <Field
            label="Residente"
            help={
              residentesUnicos.length === 0
                ? "Aún no hay residentes registrados."
                : undefined
            }
          >
            <Select
              name="residente"
              autoComplete="off"
              value={filtros.residente}
              onChange={actualizarFiltro}
            >
              <option value="">Todos los residentes</option>
              {residentesUnicos.map((residente) => (
                <option
                  key={residente.id_usuario}
                  value={residente.id_usuario}
                >
                  {[residente.nombre, residente.apellido]
                    .filter(Boolean)
                    .join(" ")}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Button variant="quiet" disabled={loading} onClick={reload}>
          Actualizar
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id_reserva}
        caption="Listado de reservas del condominio"
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={hayFiltros ? "No hay reservas que coincidan." : "No hay reservas"}
        emptyDescription={
          hayFiltros
            ? "Ajusta los filtros para ver resultados."
            : "Las solicitudes de reserva de los residentes aparecerán aquí."
        }
        emptyAction={
          hayFiltros ? <Button variant="quiet" onClick={limpiarFiltros}>Limpiar filtros</Button> : undefined
        }
      />
    </section>
  );
}
