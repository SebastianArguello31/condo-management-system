/* Unidades (CRUD legacy; el detalle de edificios y el timeout borrados como
 * dead code aprobado en CP6b: la rama `buildings` nunca se montaba —
 * la pantalla real de edificios es BuildingsPage). */
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";

const FIELDS = [
  { name: "codigo", label: "Código", required: true },
  { name: "piso", label: "Piso" },
  { name: "id_edificio", label: "Edificio", type: "number", required: true },
  { name: "id_tipo_unidad", label: "Tipo de unidad", type: "number", required: true },
];

const COLUMNS = [
  { name: "id_unidad", label: "ID" },
  { name: "codigo", label: "Código" },
  { name: "piso", label: "Piso" },
  { name: "edificio", label: "Edificio" },
  { name: "tipo_unidad", label: "Tipo" },
];

export default function UnitsPage() {
  return <CrudPage title="Unidades" endpoint={routes.units} idField="id_unidad" fields={FIELDS} columns={COLUMNS} />;
}
