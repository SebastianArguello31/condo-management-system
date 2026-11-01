/* F2-7a — Espacios comunes al kit sobre CrudPage modo ui. Paridad con el
 * legado: GET/POST /common-spaces y PATCH /common-spaces/:id (canDelete
 * {false}: sin Eliminar; el backend tampoco expone DELETE de espacio); el
 * campo "activo" va deshabilitado al CREAR (isFieldDisabled con !row) y el
 * POST lo omite (SpaceCreateSchema no lo acepta; al editar sí sale en el
 * body PATCH). Validación en cliente con `espacioCrear` (espejo de
 * SpaceCreateSchema). RowActions: Editar (internas de CrudPageUi) +
 * "Detalle" y "Políticas" quiet sm vía renderExtraActions. "Detalle"
 * conserva el GET anidado /common-spaces/:id y pasa a Modal del kit con
 * DefinitionList (Skeleton/ErrorState solo SIN datos; footer solo
 * "Cerrar"). "Políticas" sigue abriendo la subvista LEGADA con estado
 * local sin cambios (SpacePolicies.jsx intacto); el hash
 * #/espacios?politicas=<id> llega en F2-7b (B6). Sin el <button hidden>
 * muerto del legado. */
import { useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import {
  Button,
  DefinitionList,
  ErrorState,
  Modal,
  Skeleton,
  StatusBadge,
} from "../../components/ui";
import { useQuery } from "../../hooks/useQuery";
import { espacioCrear } from "../../validations";
import SpacePolicies from "./SpacePolicies";

/* Constante de MÓDULO (referencia estable para useQuery): catálogo de
 * edificios. */
const LOOKUPS = [{ name: "buildings", endpoint: routes.buildings }];

const FIELDS = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 150 },
  {
    name: "descripcion",
    label: "Descripción",
    type: "textarea",
    nullable: true,
    maxLength: 1000,
  },
  { name: "capacidad", label: "Capacidad", type: "number", required: true },
  {
    name: "id_edificio",
    label: "Edificio",
    type: "select",
    lookup: "buildings",
    optionId: "id_edificio",
    required: true,
    emptyMessage: "No hay edificios registrados.",
  },
  { name: "activo", label: "Activo", type: "checkbox" },
];

/* Sin columna ID (id solo como rowKey); Estado con StatusBadge override
 * ACTIVA success+check / INACTIVA muted (el backend envía boolean
 * `activo`, sin preset propio). */
const COLUMNS = [
  { name: "nombre", label: "Nombre" },
  { name: "capacidad", label: "Capacidad" },
  { name: "edificio", label: "Edificio" },
  {
    name: "activo",
    label: "Estado",
    render: (row) =>
      row.activo ? (
        <StatusBadge estado="ACTIVA" tone="success" glyph="check" />
      ) : (
        <StatusBadge estado="INACTIVA" tone="muted" />
      ),
  },
];

function EspacioDetalleModal({ espacio, onClose }) {
  /* GET anidado del detalle (el mismo del legado), con signal. */
  const { data: detail, loading, error, reload } = useQuery(
    async (signal) =>
      api(`${routes.commonSpaces}/${espacio.id_espacio_comun}`, { signal }),
    [espacio.id_espacio_comun]
  );

  return (
    <Modal
      title={detail ? detail.nombre : "Detalle del espacio"}
      onClose={onClose}
      footer={<Button variant="quiet" onClick={onClose}>Cerrar</Button>}
    >
      {loading && !detail && <Skeleton lines={6} />}

      {!loading && error && !detail && (
        <ErrorState
          title="No se pudo cargar el detalle"
          description={error.message}
          onRetry={() => reload()}
        />
      )}

      {detail && (
        <DefinitionList
          items={[
            {
              term: "Estado",
              detail: detail.activo ? (
                <StatusBadge estado="ACTIVA" tone="success" glyph="check" />
              ) : (
                <StatusBadge estado="INACTIVA" tone="muted" />
              ),
            },
            { term: "Capacidad", detail: detail.capacidad },
            { term: "Edificio", detail: detail.edificio },
            ...(detail.descripcion
              ? [{ term: "Descripción", detail: detail.descripcion }]
              : []),
          ]}
        />
      )}
    </Modal>
  );
}

export default function EspaciosPage() {
  const [policySpace, setPolicySpace] = useState(null);
  const [detailSpace, setDetailSpace] = useState(null);

  if (policySpace) {
    return <SpacePolicies space={policySpace} onBack={() => setPolicySpace(null)} />;
  }

  return (
    <>
      <CrudPage
        variant="ui"
        title="Espacios comunes"
        description="Administra los espacios comunes del condominio."
        endpoint={routes.commonSpaces}
        idField="id_espacio_comun"
        fields={FIELDS}
        columns={COLUMNS}
        lookups={LOOKUPS}
        canDelete={false}
        /* En CREAR (row → null) "activo" queda deshabilitado y el body
         * lo omite, como en el legado. */
        isFieldDisabled={(field, row) => field.name === "activo" && !row}
        renderExtraActions={(row, busy) => (
          <>
            <Button
              variant="quiet"
              size="sm"
              aria-label={`Ver detalle de ${row.nombre}`}
              onClick={() => setDetailSpace(row)}
            >
              Detalle
            </Button>
            <Button
              variant="quiet"
              size="sm"
              aria-label={`Ver políticas de reserva de ${row.nombre}`}
              onClick={() => setPolicySpace(row)}
            >
              Políticas
            </Button>
          </>
        )}
        getRecordLabel={(row) => `espacio ${row.nombre}`}
        createLabel="Nuevo espacio"
        editLabel="Editar espacio"
        schema={espacioCrear}
      />

      {detailSpace && (
        <EspacioDetalleModal
          espacio={detailSpace}
          onClose={() => setDetailSpace(null)}
        />
      )}
    </>
  );
}
