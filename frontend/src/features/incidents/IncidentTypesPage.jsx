import CrudPage from "../../components/CrudPage";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 100 },
  {
    name: "descripcion",
    label: "Descripción",
    type: "textarea",
    nullable: true,
    maxLength: 500,
  },
  { name: "activo", label: "Tipo activo", type: "checkbox" },
];

const columns = [
  { name: "nombre", label: "Nombre" },
  { name: "descripcion", label: "Descripción" },
  { name: "activo", label: "Activo" },
];

export default function IncidentTypesPage() {
  return (
    <CrudPage
      title="Tipos de incidencia"
      endpoint="/incidents/types"
      idField="id_tipo_incidencia"
      fields={fields}
      columns={columns}
      getRecordLabel={(row) => `tipo de incidencia ${row.nombre}`}
    />
  );
}
