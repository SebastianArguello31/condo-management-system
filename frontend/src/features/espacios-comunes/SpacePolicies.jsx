/* Políticas del espacio seleccionado con validación de horarios y aforo.
 * La edición envía el cuerpo completo mediante PUT; los modales no se guardan en la URL. */
import { useEffect, useRef } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import CrudPage from "../../components/CrudPage";
import { Button, EmptyState, ErrorState, Skeleton } from "../../components/ui";
import { politicaCrear } from "../../validations";

/* Constante de MÓDULO (referencia estable para useQuery del CrudPageUi):
 * catálogo de tipos de evento. */
const LOOKUPS = [
  { name: "events", endpoint: `${routes.reservations}/event-types` },
];

const FIELDS = [
  {
    name: "id_tipo_evento",
    label: "Tipo de evento",
    type: "select",
    lookup: "events",
    optionId: "id_tipo_evento",
    required: true,
    emptyMessage: "No hay tipos de evento disponibles.",
  },
  { name: "hora_apertura", label: "Hora de apertura", type: "time", required: true },
  {
    name: "hora_cierre",
    label: "Hora de cierre",
    type: "time",
    required: true,
    help: "Debe ser posterior a la hora de apertura.",
  },
  {
    name: "duracion_max_horas",
    label: "Duración máxima",
    type: "number",
    required: true,
    help: "Entre 1 y 24 horas.",
  },
  { name: "dias_anticipacion_min", label: "Anticipación mínima", type: "number", required: true },
  {
    name: "dias_anticipacion_max",
    label: "Anticipación máxima",
    type: "number",
    required: true,
    help: "Mayor o igual que la mínima.",
  },
  {
    name: "aforo_maximo",
    label: "Aforo máximo",
    type: "number",
    required: true,
    help: "No puede superar la capacidad del espacio.",
  },
  { name: "costo", label: "Costo", type: "number", min: 0, step: "0.01", required: true },
  { name: "deposito_garantia", label: "Depósito", type: "number", min: 0, step: "0.01", required: true },
  { name: "penalizaciones", label: "Penalización", type: "number", min: 0, step: "0.01", required: true },
];

/* Sin columna ID (id solo como rowKey); horas textuales "HH:MM" del
 * backend (to_char), tal cual (convención §8-ter de F2-7a). */
const COLUMNS = [
  { name: "tipo_evento", label: "Evento" },
  { name: "hora_apertura", label: "Apertura" },
  { name: "hora_cierre", label: "Cierre" },
  { name: "aforo_maximo", label: "Aforo" },
  { name: "costo", label: "Costo" },
];

export default function SpacePolicies({ idEspacio, onVolver }) {
  const seccionRef = useRef(null);

  /* Detalle del ESPACIO (GET /common-spaces/:id, con signal): nombre para
   * el título, capacidad para la regla de aforo y 404 explícito del
   * backend. enabled=false con id inválido (nada que consultar). */
  const { data: espacio, loading, error, reload } = useQuery(
    (signal) => api(`${routes.commonSpaces}/${idEspacio}`, { signal }),
    [idEspacio],
    { enabled: idEspacio !== null }
  );
  const listo = Boolean(espacio);

  /* Foco al h1 del PageHeader (título de la subvista) al entrar. */
  useEffect(() => {
    if (!listo) return;
    const h1 = seccionRef.current?.querySelector("h1");
    if (h1) {
      h1.setAttribute("tabindex", "-1");
      h1.focus();
    }
  }, [listo]);

  const volver = (
    <Button variant="quiet" onClick={onVolver}>
      Volver a espacios
    </Button>
  );

  /* Id inválido (no numérico o fuera de rango) u espacio inexistente
   * (404 del GET): EmptyState del kit con la acción de volver. */
  if (idEspacio === null || (error && !espacio && error.status === 404)) {
    return (
      <section>
        <EmptyState
          title="Políticas de reserva no disponibles"
          description={
            idEspacio === null
              ? "El enlace de políticas de reserva es inválido."
              : error.message
          }
          action={volver}
        />
      </section>
    );
  }

  return (
    <section ref={seccionRef}>
      {/* Botón de volver SIEMPRE visible (también en carga y error),
       * separado del header del CrudPageUi por --space-4. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
        {volver}
      </div>

      {loading && !espacio && <Skeleton lines={6} />}

      {!loading && error && !espacio && (
        <ErrorState
          title="No se pudo cargar el espacio"
          description={error.message}
          onRetry={() => reload()}
        />
      )}

      {espacio && (
        <CrudPage
          variant="ui"
          title={`Políticas de ${espacio.nombre}`}
          description="Administra las políticas de reserva del espacio."
          endpoint={`${routes.commonSpaces}/${idEspacio}/policies`}
          updateMethod="PUT"
          idField="id_politica_reserva"
          fields={FIELDS}
          columns={COLUMNS}
          lookups={LOOKUPS}
          getRecordLabel={(row) => `política de ${row.tipo_evento}`}
          createLabel="Nueva política"
          editLabel="Editar política"
          schema={politicaCrear(espacio.capacidad)}
        />
      )}
    </section>
  );
}
