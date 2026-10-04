import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";

const fields = [
  { name: "codigo", label: "Código", required: true, maxLength: 50 },
  { name: "piso", label: "Piso", nullable: true, maxLength: 30 },
  {
    name: "id_edificio",
    label: "Edificio",
    type: "select",
    required: true,
    lookup: "buildings",
    optionId: "id_edificio",
  },
  {
    name: "id_tipo_unidad",
    label: "Tipo de unidad",
    type: "select",
    required: true,
    lookup: "types",
    optionId: "id_tipo_unidad",
  },
];

const columns = [
  { name: "id_unidad", label: "ID" },
  { name: "codigo", label: "Código" },
  { name: "piso", label: "Piso" },
  { name: "edificio", label: "Edificio" },
  { name: "tipo_unidad", label: "Tipo" },
];

const lookups = [
  { name: "buildings", endpoint: `${routes.buildings}` },
  { name: "types", endpoint: `${routes.unitTypes}` },
];

export default function UnitsPage() {
  return (
    <CrudPage
      description="Organiza las unidades por edificio, piso y tipo."
      title="Unidades"
      endpoint={`${routes.units}`}
      idField="id_unidad"
      fields={fields}
      columns={columns}
      lookups={lookups}
    />
  );
}