import CrudPage from "../../components/CrudPage";
import { routes } from "../../services/routes";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 100 },
  {
    name: "descripcion",
    label: "Descripción",
    type: "textarea",
    maxLength: 500,
  },
];

const columns = [
  { key: "nombre", header: "Nombre" },
  {
    key: "descripcion",
    header: "Descripción",
    render: (row) => row.descripcion || "Sin descripción",
  },
];

export default function BuildingTypesPage() {
  return (
    <CrudPage
      variant="ui"
      title="Tipos de edificio"
      description="Administra los tipos disponibles para clasificar los edificios del condominio."
      endpoint={routes.buildingTypes}
      idField="id_tipo_edificio"
      fields={fields}
      columns={columns}
      createLabel="Nuevo tipo de edificio"
      editLabel="Editar tipo de edificio"
      getRecordLabel={(row) => `tipo de edificio ${row.nombre}`}
    />
  );
}
