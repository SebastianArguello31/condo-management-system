/* Unidades (F2-2: migrada al modo "ui" de CrudPage; "Tipo de unidad" es un
 * select del catálogo GET /unit-types — cierra B10; el listado muestra el
 * NOMBRE del tipo y del edificio, ambos provistos por el backend). */
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";

const LOOKUPS = [
  { name: "buildings", endpoint: routes.buildings },
  { name: "unitTypes", endpoint: routes.unitTypes },
];

const FIELDS = [
  { name: "codigo", label: "Código", required: true },
  { name: "piso", label: "Piso" },
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
    lookup: "unitTypes",
    optionId: "id_tipo_unidad",
  },
];

const COLUMNS = [
  { name: "codigo", label: "Código" },
  { name: "piso", label: "Piso" },
  { name: "edificio", label: "Edificio" },
  { name: "tipo_unidad", label: "Tipo" },
];

export default function UnitsPage() {
  return (
    <CrudPage
      variant="ui"
      title="Unidades"
      description="Administra las unidades, edificios y tipos del condominio."
      endpoint={routes.units}
      idField="id_unidad"
      fields={FIELDS}
      columns={COLUMNS}
      lookups={LOOKUPS}
      createLabel="Nueva unidad"
      editLabel="Editar unidad"
      getRecordLabel={(row) => `unidad ${row.codigo}`}
    />
  );
}
