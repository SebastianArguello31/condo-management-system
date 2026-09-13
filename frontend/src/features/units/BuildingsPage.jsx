import CrudPage from "../../components/CrudPage";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 150 },
  {
    name: "direccion",
    label: "Dirección",
    nullable: true,
    maxLength: 300,
  },
  {
    name: "id_tipo_edificio",
    label: "Tipo de edificio",
    type: "select",
    required: true,
    lookup: "types",
    optionId: "id_tipo_edificio",
  },
];

const columns = [
  { name: "id_edificio", label: "ID" },
  { name: "nombre", label: "Nombre" },
  { name: "direccion", label: "Dirección" },
  { name: "tipo_edificio", label: "Tipo" },
];

const lookups = [
  { name: "types", endpoint: "/building-types" },
];

export default function BuildingsPage() {
  return (
    <CrudPage
      title="Edificios"
      endpoint="/buildings"
      idField="id_edificio"
      fields={fields}
      columns={columns}
      lookups={lookups}
    />
  );
}