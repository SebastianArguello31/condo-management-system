import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 100 },
  { name: "descripcion", label: "Descripción", type: "textarea", nullable: true, maxLength: 500 },
  { name: "activo", label: "Especialidad activa", type: "checkbox" },
];

const columns = [
  { name: "nombre", label: "Nombre" },
  { name: "descripcion", label: "Descripción" },
  {
    name: "activo",
    label: "Estado",
    render: (row) =>
      row.activo ? <StatusBadge estado="ACTIVA" tone="success" glyph="check" /> : <StatusBadge estado="INACTIVA" tone="muted" />,
  },
];

export default function SpecialtiesPage() {
  return <CrudPage variant="ui" title="Especialidades" description="Administra el catálogo de especialidades laborales." endpoint={routes.specialties} idField="id_especialidad" fields={fields} columns={columns} createLabel="Nueva especialidad" editLabel="Editar especialidad" getRecordLabel={(row) => `especialidad ${row.nombre}`} />;
}
