import CrudPage from "../../components/CrudPage";
import { routes } from "../../services/routes";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 100 },
  { name: "descripcion", label: "Descripción", type: "textarea", nullable: true, maxLength: 500 },
  { name: "activo", label: "Especialidad activa", type: "checkbox" },
];

const columns = [
  { name: "id_especialidad", label: "ID" },
  { name: "nombre", label: "Nombre" },
  { name: "descripcion", label: "Descripción" },
  { name: "activo", label: "Estado" },
];

export default function SpecialtiesPage() {
  return <CrudPage title="Especialidades" description="Administra el catálogo de especialidades laborales." endpoint={routes.specialties} idField="id_especialidad" fields={fields} columns={columns} />;
}
