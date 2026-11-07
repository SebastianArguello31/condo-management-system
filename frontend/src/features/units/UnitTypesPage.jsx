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

export default function UnitTypesPage() {
  return (
    <CrudPage
      variant="ui"
      title="Tipos de unidad"
      description="Administra los tipos disponibles para clasificar las unidades del condominio."
      endpoint={routes.unitTypes}
      idField="id_tipo_unidad"
      fields={fields}
      columns={columns}
      createLabel="Nuevo tipo de unidad"
      editLabel="Editar tipo de unidad"
      getRecordLabel={(row) => `tipo de unidad ${row.nombre}`}
    />
  );
}
