import { useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { useConfirm } from "../../hooks/useConfirm";
import { usePagination } from "../../hooks/usePagination";
import { formatDate, formatTime } from "../../utils/format";
import { DataTable, DefinitionList, Modal, PageHeader, Pagination, RowActions, StatusBadge, useToast, } from "../../components/ui";
import CreateReservation from "./CreateReservation";

function puedeCancelar(estado) {
  return ["PENDIENTE", "CONFIRMADA"].includes(estado);
}

export default function MisReservasPage() {
  const { data, loading, error, reload } = useQuery(
    async (signal) => {
      const [reservas, espacios, tiposEvento] = await Promise.all([
        api(routes.reservations, { signal }),
        api(routes.commonSpaces, { signal }),
        api(`${routes.reservations}/event-types`, { signal }),
      ]);

      return [
        reservas ?? [],
        espacios ?? [],
        tiposEvento ?? [],
      ];
    },
    []
  );

  const [rows = [], spaces = [], events = []] = data || [];

  /* Paginación EN EL CLIENTE (F2-13b): sin filtros ni búsqueda (la lista
   * es la propia del residente) → sin resetKey; solo cambia de página el
   * usuario. Meta y EmptyState siguen con `rows` (total). */
  const pag = usePagination(rows);

  const [detail, setDetail] = useState(null);
  const confirm = useConfirm();
  const toast = useToast();

  const cancelar = useMutation((id) =>
    api(`${routes.reservations}/${id}/status`, {
      method: "PATCH",
      body: { estado: "CANCELADA" },
    })
  );

  async function openDetail(row) {
    try {
      setDetail(
        await api(`${routes.reservations}/${row.id_reserva}`)
      );
    } catch (err) {
      toast(
        err.message || "No se pudo cargar el detalle de la reserva.",
        { tone: "danger" }
      );
    }
  }

  async function pedirCancelacion(row) {
    if (cancelar.busy || !puedeCancelar(row.estado)) return;

    const ok = await confirm({
      title: "Cancelar reserva",
      message: `La reserva de ${row.espacio} del ${formatDate(row.fecha)} quedará CANCELADA y no hay vuelta atrás.`,
      confirmLabel: "Sí, cancelar reserva",
      danger: true,
    });

    if (!ok) return;

    try {
      await cancelar.run(row.id_reserva);
      toast("Reserva cancelada.");
      reload();

      if (detail?.id_reserva === row.id_reserva) {
        setDetail((current) => ({
          ...current,
          estado: "CANCELADA",
        }));
      }
    } catch (err) {
      toast(
        err.message || "No se pudo cancelar la reserva.",
        { tone: "danger" }
      );
    }
  }

  const pendientes = rows.filter(
    (row) => row.estado === "PENDIENTE"
  ).length;

  const meta =
    !loading && rows.length > 0
      ? `${rows.length} ${rows.length === 1 ? "reserva" : "reservas"} · ${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}`
      : undefined;

  const columns = [
    {
      key: "fecha",
      header: "Fecha",
      cellClassName: "ui-mono",
      render: (row) => formatDate(row.fecha),
    },
    {
      key: "espacio",
      header: "Espacio",
    },
    {
      key: "tipo_evento",
      header: "Evento",
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <StatusBadge estado={row.estado} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      width: "calc(var(--space-12) * 4)",
      render: (row) => (
        <RowActions
          actions={[
            {
              label: "Detalle",
              ariaLabel: `Ver detalle de la reserva del ${formatDate(row.fecha)}, ${row.espacio}`,
              onSelect: () => openDetail(row),
            },
            ...(puedeCancelar(row.estado)
              ? [{
                  label: "Cancelar",
                  danger: true,
                  disabled: cancelar.busy,
                  ariaLabel: `Cancelar reserva del ${formatDate(row.fecha)}, ${row.espacio}`,
                  onSelect: () => pedirCancelacion(row),
                }]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <section>
      <PageHeader
        title="Mis reservas"
        meta={meta}
        actions={
          !loading && rows.length === 0
            ? null
            : (
              <CreateReservation
                spaces={spaces}
                events={events}
                onCreated={reload}
              />
            )
        }
      />

      <DataTable
        columns={columns}
        rows={pag.pageRows}
        rowKey={(row) => row.id_reserva}
        caption="Tus reservas de espacios comunes"
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle="No tienes reservas todavía"
        emptyDescription="Consulta los espacios comunes disponibles y solicita tu primera reserva."
        emptyAction={
          !loading && rows.length === 0
            ? (
              <CreateReservation
                spaces={spaces}
                events={events}
                onCreated={reload}
              />
            )
            : null
        }
      />
      <Pagination
        page={pag.page}
        pageCount={pag.pageCount}
        total={pag.total}
        from={pag.from}
        to={pag.to}
        onPrev={pag.goPrev}
        onNext={pag.goNext}
        label="Paginación de mis reservas"
      />

      {detail && (
        <Modal
          title={`Reserva #${detail.id_reserva}`}
          onClose={() => setDetail(null)}
        >
          <DefinitionList
            items={[
              {
                term: "Espacio",
                detail: detail.espacio,
              },
              {
                term: "Tipo de evento",
                detail: detail.tipo_evento,
              },
              {
                term: "Fecha",
                detail: formatDate(detail.fecha),
              },
              {
                term: "Horario",
                detail: `${formatTime(detail.hora_inicio)} - ${formatTime(detail.hora_fin)}`,
              },
              {
                term: "Personas",
                detail: detail.cantidad_personas,
              },
              {
                term: "Estado",
                detail: <StatusBadge estado={detail.estado} />,
              },
              ...(detail.observaciones
                ? [{
                    term: "Observaciones",
                    detail: detail.observaciones,
                  }]
                : []),
            ]}
          />
        </Modal>
      )}
    </section>
  );
}