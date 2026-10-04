import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";

const fields = [
  { name: "id_tipo_evento", label: "Tipo de evento", type: "select", required: true, lookup: "events", optionId: "id_tipo_evento" },
  { name: "hora_apertura", label: "Hora de apertura", type: "time", required: true },
  { name: "hora_cierre", label: "Hora de cierre", type: "time", required: true },
  { name: "duracion_max_horas", label: "Duración máxima (horas)", type: "number", min: 1, max: 24, required: true },
  { name: "dias_anticipacion_min", label: "Anticipación mínima (días)", type: "number", min: 0, required: true },
  { name: "dias_anticipacion_max", label: "Anticipación máxima (días)", type: "number", min: 0, required: true },
  { name: "aforo_maximo", label: "Aforo máximo", type: "number", min: 1, required: true },
  { name: "costo", label: "Costo", type: "number", min: 0, step: "0.01", required: true },
  { name: "deposito_garantia", label: "Depósito de garantía", type: "number", min: 0, step: "0.01", required: true },
  { name: "penalizaciones", label: "Penalización", type: "number", min: 0, step: "0.01", required: true },
];
const columns = [
  { name: "tipo_evento", label: "Evento" },
  { name: "hora_apertura", label: "Apertura" },
  { name: "hora_cierre", label: "Cierre" },
  { name: "duracion_max_horas", label: "Máximo (h)" },
  { name: "aforo_maximo", label: "Aforo" },
  { name: "costo", label: "Costo" },
];
const lookups = [{ name: "events", endpoint: `${routes.reservations}/event-types` }];

export default function SpacePolicies({ space, onBack }) {
  return <>
    <button className="mg-secondary" onClick={onBack}>Volver a espacios comunes</button>
    <CrudPage title={`Políticas · ${space.nombre}`} description="Configura una política por tipo de evento para permitir reservas."
      endpoint={`${routes.commonSpaces}/${space.id_espacio_comun}/policies`} updateMethod="PUT"
      idField="id_politica_reserva" fields={fields} columns={columns} lookups={lookups} />
  </>;
}
