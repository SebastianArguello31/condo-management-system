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
  { name: "capacidad", label: "Capacidad", type: "number", required: true },
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
  { name: "buildings", endpoint: "/buildings" },
];

export default function EspaciosPage() {
  return (
    <CrudPage
      title="Espacios comunes"
      endpoint="/espacios"
      idField="id_espacio_comun"
      fields={fields}
      columns={columns}
      lookups={lookups}
      canDelete={false}
      isFieldDisabled={(field, editingRow) => field.name === "activo" && !editingRow}
    />
  );
}
