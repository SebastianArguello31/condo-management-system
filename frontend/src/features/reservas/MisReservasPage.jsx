import { useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { useConfirm } from "../../hooks/useConfirm";
import { formatDate } from "../../utils/format";
import {
  DataTable,
  DefinitionList,
  Modal,
  PageHeader,
  RowActions,
  StatusBadge,
  useToast,
} from "../../components/ui";
import CreateReservation from "./CreateReservation";

/* F2-3 — Mis reservas migrada al kit (uso real de CP2 + CP3 + CP4).
 * Mismas consultas, orden y reglas que antes: lista GET /reservations con
 * espacios y tipos de evento para el form; detalle GET /reservations/:id;
 * cancelación PATCH /reservations/:id/status solo con estado PENDIENTE o
 * CONFIRMADA (confirmación por ConfirmDialog, no window.confirm).
 * Ajuste final: acciones visibles con botones (Detalle con borde y
 * Cancelar ghost rojo, con aria-label que identifica la reserva) en lugar
 * del menú de fila; Fecha en DD/MM/AAAA (utils/format). */

function puedeCancelar(estado) {
  return ["PENDIENTE", "CONFIRMADA"].includes(estado);
}

export default function MisReservasPage() {
  /* Una sola consulta (reservas + espacios + tipos de evento, igual que el
   * load() anterior): loading inicial true y reload() conserva datos previos,
   * así la lista no titila en las recargas. */
  const { data, loading, error, reload } = useQuery(async () => {
    const [reservas, espacios, tiposEvento] = await Promise.all([
      api(routes.reservations),
      api(routes.commonSpaces),
      api(`${routes.reservations}/event-types`),
    ]);
    return [reservas ?? [], espacios ?? [], tiposEvento ?? []];
  }, []);
  /* Fila/espacios/eventos con defaults POR POSICIÓN: data es undefined en el
   * primer render y desestructurar sin defaults daría undefined para cada
   * una (no []). */
  const [rows = [], spaces = [], events = []] = data || [];

  const [detail, setDetail] = useState(null);
  const confirm = useConfirm();
  const toast = useToast();
  const cancelar = useMutation((id) =>
    api(`${routes.reservations}/${id}/status`, { method: "PATCH", body: { estado: "CANCELADA" } }));

  async function openDetail(row) {
    try {
      setDetail(await api(`${routes.reservations}/${row.id_reserva}`));
    } catch (err) {
      toast(err.message || "No se pudo cargar el detalle de la reserva.", { tone: "danger" });
    }
  }

  async function pedirCancelacion(row) {
    const ok = await confirm({
      title: "Cancelar reserva",
      message: `La reserva de ${row.espacio} del ${row.fecha} quedará CANCELADA y no hay vuelta atrás.`,
      confirmLabel: "Sí, cancelar reserva",
      danger: true,
    });
    if (!ok) return;
    try {
      await cancelar.run(row.id_reserva);
      toast("Reserva cancelada.");
      reload();
    } catch (err) {
      toast(err.message || "No se pudo cancelar la reserva.", { tone: "danger" });
    }
  }

  const pendientes = rows.filter((row) => row.estado === "PENDIENTE").length;
  const meta = !loading && rows.length > 0
    ? `${rows.length} ${rows.length === 1 ? "reserva" : "reservas"} · ${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}`
    : undefined;

  const columns = [
    { key: "fecha", header: "Fecha", cellClassName: "ui-mono", render: (row) => formatDate(row.fecha) },
    { key: "espacio", header: "Espacio" },
    { key: "tipo_evento", header: "Evento" },
    { key: "estado", header: "Estado", render: (row) => <StatusBadge estado={row.estado} /> },
    {
      key: "acciones",
      header: "Acciones",
      /* Columna de ancho FIJO con tokens (colgroup del DataTable) y
       * contenido alineado a la IZQUIERDA: th y td comparten el mismo
       * relleno (--space-3) y la fila de acciones (RowActions sobre
       * .ui-actions-inline) lo compensa para que el texto arranque en la
       * misma x que "ACCIONES". Botones visibles (Detalle con borde y
       * Cancelar ghost rojo, SOLO si el estado permite cancelar); el
       * flujo no cambia (useConfirm danger + useMutation + Toast).
       * aria-label descriptivo con fecha (ISO) y espacio. */
      width: "calc(var(--space-12) * 4)",
      render: (row) => (
        <RowActions
          actions={[
            {
              label: "Detalle",
              ariaLabel: `Ver detalle de la reserva del ${row.fecha}, ${row.espacio}`,
              onSelect: () => openDetail(row),
            },
            ...(puedeCancelar(row.estado)
              ? [{
                  label: "Cancelar",
                  danger: true,
                  disabled: cancelar.busy,
                  ariaLabel: `Cancelar reserva del ${row.fecha}, ${row.espacio}`,
                  onSelect: () => pedirCancelacion(row),
                }]
              : []),
          ]}
        />
      ),
    },
  ];

  return <section>
    <PageHeader
      title="Mis reservas"
      meta={meta}
      actions={!loading && rows.length === 0
        ? null
        : <CreateReservation spaces={spaces} events={events} onCreated={reload} />}
    />
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id_reserva}
      caption="Tus reservas de espacios comunes"
      loading={loading}
      error={error}
      onRetry={reload}
      emptyTitle="No tienes reservas todavía"
      emptyDescription="Consulta los espacios comunes disponibles y solicita tu primera reserva."
      emptyAction={!loading && rows.length === 0
        ? <CreateReservation spaces={spaces} events={events} onCreated={reload} />
        : null}
    />
    {detail && <Modal title={`Reserva #${detail.id_reserva}`} onClose={() => setDetail(null)}>
      <DefinitionList
        items={[
          { term: "Espacio", detail: detail.espacio },
          { term: "Tipo de evento", detail: detail.tipo_evento },
          { term: "Fecha", detail: detail.fecha },
          { term: "Horario", detail: `${detail.hora_inicio} - ${detail.hora_fin}` },
          { term: "Personas", detail: detail.cantidad_personas },
          { term: "Estado", detail: <StatusBadge estado={detail.estado} /> },
          ...(detail.observaciones ? [{ term: "Observaciones", detail: detail.observaciones }] : []),
        ]}
      />
    </Modal>}
  </section>;
}
