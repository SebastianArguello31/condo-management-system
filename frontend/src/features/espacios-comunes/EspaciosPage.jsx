import { routes } from "../../services/routes";
import { useState } from "react";
import SpacePolicies from "./SpacePolicies";
import CrudPage from "../../components/CrudPage";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 150 },
  {
    name: "descripcion",
    label: "Descripción",
    type: "textarea",
    nullable: true,
    maxLength: 1000,
  },
  { name: "capacidad", label: "Capacidad", type: "number", required: true, min: 1, step: 1 },
  {
    name: "id_edificio",
    label: "Edificio",
    type: "select",
    required: true,
    lookup: "buildings",
    optionId: "id_edificio",
  },
  { name: "activo", label: "Activo", type: "checkbox" },
];

const columns = [
  { name: "id_espacio_comun", label: "ID" },
  { name: "nombre", label: "Nombre" },
  { name: "descripcion", label: "Descripción" },
  { name: "capacidad", label: "Capacidad" },
  { name: "edificio", label: "Edificio" },
  { name: "activo", label: "Activo" },
];

const lookups = [
  { name: "buildings", endpoint: `${routes.buildings}` },
];

export default function EspaciosPage() {
  const [space, setSpace] = useState(null);
  if (space) return <SpacePolicies space={space} onBack={() => setSpace(null)} />;
  return (
    <CrudPage
      title="Espacios comunes"
      description="Administra capacidad, disponibilidad y políticas de uso de los espacios."
      renderExtraActions={(row, busy) => <button className="mg-secondary" disabled={busy} onClick={() => setSpace(row)}>Políticas de reserva</button>}
      endpoint={`${routes.commonSpaces}`}
      idField="id_espacio_comun"
      fields={fields}
      columns={columns}
      lookups={lookups}
      canDelete={false}
      isFieldDisabled={(field, editingRow) => field.name === "activo" && !editingRow}
    />
  );
}
