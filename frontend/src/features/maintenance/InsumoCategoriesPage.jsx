import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 80 },
  {
    name: "descripcion",
    label: "Descripción",
    type: "textarea",
    nullable: true,
    maxLength: 500,
  },
  { name: "activo", label: "Categoría activa", type: "checkbox" },
];

const columns = [
  { name: "nombre", label: "Nombre" },
  {
    name: "descripcion",
    label: "Descripción",
    render: (row) => row.descripcion || "Sin descripción",
  },
  {
    name: "activo",
    label: "Estado",
    render: (row) => row.activo
      ? <StatusBadge estado="ACTIVA" tone="success" glyph="check" />
      : <StatusBadge estado="INACTIVA" tone="muted" />,
  },
];

export default function InsumoCategoriesPage() {
  return (
    <CrudPage
      variant="ui"
      title="Categorías de insumos"
      description="Administra las categorías disponibles para clasificar los insumos."
      endpoint={routes.maintenanceCategories}
      idField="id_categoria_insumo"
      fields={fields}
      columns={columns}
      createLabel="Nueva categoría"
      editLabel="Editar categoría"
      getRecordLabel={(row) => `categoría ${row.nombre}`}
    />
  );
}
