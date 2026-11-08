import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { useConfirm } from "../../hooks/useConfirm";
import { formatDate, formatTime } from "../../utils/format";
import DateInput from "../../components/ui/DateInput";
import {
  Button,
  DataTable,
  ErrorState,
  Field,
  FilterBar,
  PageHeader,
  RowActions,
  Select,
  StatusBadge,
  useToast,
} from "../../components/ui";

const ESTADOS = [
  "PENDIENTE",
  "CONFIRMADA",
  "RECHAZADA",
  "CANCELADA",
  "FINALIZADA",
];

const ESTADOS_CANCELABLES = ["PENDIENTE", "CONFIRMADA"];

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

const EMPTY_FILTERS = {
  espacio: "",
  estado: "",
  fecha: "",
  residente: "",
};

const nombreCompleto = (row) =>
  [row?.residente_nombre, row?.residente_apellido]
    .filter(Boolean)
    .join(" ") || "—";

export default function GestionReservasPage({ user }) {
  const isAdmin = user?.rol === "ADMIN";
  const isManager = user?.rol === "GESTOR";
  const puedeAprobar = isAdmin || isManager;

  const notify = useToast();
  const confirmar = useConfirm();
  const { params } = useHashRoute();

  const [filtros, setFiltros] = useState({ ...EMPTY_FILTERS });
  const [dateReset, setDateReset] = useState(0);

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

  const estadoDesdeUrl =
    typeof params.estado === "string" &&
    ESTADOS.includes(params.estado)
      ? params.estado
      : "";

  useEffect(() => {
    setFiltros((previous) => ({
      ...previous,
      estado: estadoDesdeUrl,
    }));
  }, [estadoDesdeUrl]);

  function actualizarFiltro(event) {
    const { name, value } = event.target;

    setFiltros((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function limpiarFiltros() {
    setFiltros({ ...EMPTY_FILTERS });
    setDateReset((current) => current + 1);
  }

  const consulta = useMemo(() => {
    const queryParams = new URLSearchParams();

    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor !== "") queryParams.set(clave, valor);
    });

    return queryParams.toString();
  }, [filtros]);

  const { data, loading, error, reload } = useQuery(
    (signal) =>
      api(
        `${routes.reservations}${consulta ? `?${consulta}` : ""}`,
        { signal }
      ),
    [consulta]
  );

  const rows = data ?? [];

  const residentesUnicos = useMemo(() => {
    const grupos = new Map();

    residentes.forEach((fila) => {
      if (!grupos.has(fila.id_usuario)) {
        grupos.set(fila.id_usuario, fila);
      }
    });

    return [...grupos.values()];
  }, [residentes]);

  const cambiarEstado = useMutation((id, estado) =>
    api(`${routes.reservations}/${id}/status`, {
      method: "PATCH",
      body: { estado },
    })
  );

  async function pedirCambio(row, estado) {
    if (cambiarEstado.busy || !puedeAprobar) return;
    if (!isAdmin && estado !== "CONFIRMADA") return;

    const textos = CONFIRMACION[estado];
    if (!textos) return;

    const ok = await confirmar({
      title: textos.title,
      message:
        `La reserva de ${nombreCompleto(row)} en ${row.espacio} del ` +
        `${formatDate(row.fecha)} quedará ${estado}.` +
        (estado === "CANCELADA" ? " No hay vuelta atrás." : ""),
      confirmLabel: textos.confirmLabel,
      danger: textos.danger,
    });

    if (!ok) return;

    try {
      await cambiarEstado.run(row.id_reserva, estado);
      notify(textos.toast);
      await reload();
    } catch (err) {
      notify(
        err.message || "No se pudo actualizar la reserva.",
        { tone: "danger" }
      );
    }
  }

  const pendientes = rows.filter(
    (row) => row.estado === "PENDIENTE"
  ).length;

  const conteo =
    !loading && rows.length > 0
      ? `${rows.length} ${rows.length === 1 ? "reserva" : "reservas"} · ${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}`
      : undefined;

  const descripcion = isAdmin
    ? "Revisa todas las reservas del condominio y gestiona su aprobación, rechazo o cancelación."
    : "Revisa las solicitudes y aprueba las reservas pendientes.";

  const meta = [descripcion, conteo].filter(Boolean).join(" · ");
  const hayFiltros = consulta !== "";

  const columns = [
    {
      key: "fecha",
      header: "Fecha",
      cellClassName: "ui-mono",
      align: "right",
      render: (row) => formatDate(row.fecha),
    },
    {
      key: "espacio",
      header: "Espacio",
    },
    {
      key: "residente",
      header: "Residente",
      render: nombreCompleto,
    },
    {
      key: "tipo_evento",
      header: "Tipo de evento",
    },
    {
      key: "horario",
      header: "Horario",
      align: "right",
      cellClassName: "ui-mono",
      render: (row) => [
        formatTime(row.hora_inicio),
        formatTime(row.hora_fin),
      ].join(" - "),
    },
    {
      key: "personas",
      header: "Personas",
      align: "right",
      render: (row) => row.cantidad_personas,
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <StatusBadge estado={row.estado} />,
    },
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
              ? [{
                  label: "Aprobar",
                  ariaLabel: `Aprobar la reserva de ${nombreCompleto(row)} en ${row.espacio} del ${formatDate(row.fecha)}`,
                  disabled: cambiarEstado.busy,
                  onSelect: () => pedirCambio(row, "CONFIRMADA"),
                }]
              : []),
            ...(isAdmin && row.estado === "PENDIENTE"
              ? [{
                  label: "Rechazar",
                  danger: true,
                  ariaLabel: `Rechazar la reserva de ${nombreCompleto(row)} en ${row.espacio} del ${formatDate(row.fecha)}`,
                  disabled: cambiarEstado.busy,
                  onSelect: () => pedirCambio(row, "RECHAZADA"),
                }]
              : []),
            ...(isAdmin && ESTADOS_CANCELABLES.includes(row.estado)
              ? [{
                  label: "Cancelar",
                  danger: true,
                  ariaLabel: `Cancelar la reserva de ${nombreCompleto(row)} en ${row.espacio} del ${formatDate(row.fecha)}`,
                  disabled: cambiarEstado.busy,
                  onSelect: () => pedirCambio(row, "CANCELADA"),
                }]
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
          help={
            espacios.length === 0
              ? "Aún no hay espacios comunes registrados."
              : undefined
          }
        >
          <Select
            name="espacio"
            value={filtros.espacio}
            onChange={actualizarFiltro}
          >
            <option value="">Todos los espacios</option>
            {espacios.map((espacio) => (
              <option
                key={espacio.id_espacio_comun}
                value={espacio.id_espacio_comun}
              >
                {espacio.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Estado">
          <Select
            name="estado"
            value={filtros.estado}
            onChange={actualizarFiltro}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha">
          <DateInput
            name="fecha"
            value={filtros.fecha}
            onChange={actualizarFiltro}
            resetKey={dateReset}
          />
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

        <Button
          variant="quiet"
          disabled={loading}
          onClick={reload}
        >
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
        emptyTitle={
          hayFiltros
            ? "No hay reservas que coincidan."
            : "No hay reservas"
        }
        emptyDescription={
          hayFiltros
            ? "Ajusta los filtros para ver resultados."
            : "Las solicitudes de reserva de los residentes aparecerán aquí."
        }
        emptyAction={
          hayFiltros
            ? (
              <Button variant="quiet" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            )
            : undefined
        }
      />
    </section>
  );
}