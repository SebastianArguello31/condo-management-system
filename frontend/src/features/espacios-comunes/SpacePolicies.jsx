import CrudPage from "../../components/CrudPage";
import { routes } from "../../services/routes";

export default function SpacePolicies({ space, onBack }) {
  const fields = [
    { name: "id_tipo_evento", label: "Tipo de evento", type: "number", required: true },
    { name: "hora_apertura", label: "Hora de apertura", type: "time", required: true },
    { name: "hora_cierre", label: "Hora de cierre", type: "time", required: true },
    { name: "duracion_max_horas", label: "Duración máxima", type: "number", required: true },
    { name: "dias_anticipacion_min", label: "Anticipación mínima", type: "number", required: true },
    { name: "dias_anticipacion_max", label: "Anticipación máxima", type: "number", required: true },
    { name: "aforo_maximo", label: "Aforo máximo", type: "number", required: true },
    { name: "costo", label: "Costo", type: "number", required: true },
    { name: "deposito_garantia", label: "Depósito", type: "number", required: true },
    { name: "penalizaciones", label: "Penalización", type: "number", required: true },
  ];
  const columns = [{ name: "tipo_evento", label: "Evento" }, { name: "hora_apertura", label: "Apertura" }, { name: "hora_cierre", label: "Cierre" }, { name: "aforo_maximo", label: "Aforo" }, { name: "costo", label: "Costo" }];
  return <section><button className="mg-secondary" onClick={onBack}>Volver</button><CrudPage title={`Políticas · ${space.nombre}`} endpoint={`${routes.commonSpaces}/${space.id_espacio_comun}/policies`} updateMethod="PUT" idField="id_politica_reserva" fields={fields} columns={columns} /></section>;
}
