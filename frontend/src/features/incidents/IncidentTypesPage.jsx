import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";

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
  { name: "descripcion", label: "Descripción", render: (row) => row.descripcion || "Sin descripción" },
  {
    name: "activo",
    label: "Estado",
    render: (row) => row.activo
      ? <StatusBadge estado="ACTIVO" tone="success" glyph="check" />
      : <StatusBadge estado="INACTIVO" tone="muted" />,
  },
];

export default function IncidentTypesPage() {
  return (
    <CrudPage
      variant="ui"
      title="Tipos de incidencia"
      description="Administra las categorías disponibles para clasificar incidencias."
      endpoint={routes.incidentTypes}
      idField="id_tipo_incidencia"
      fields={fields}
      columns={columns}
      createLabel="Nuevo tipo de incidencia"
      editLabel="Editar tipo de incidencia"
      getRecordLabel={(row) => `tipo de incidencia ${row.nombre}`}
    />
  );
}
