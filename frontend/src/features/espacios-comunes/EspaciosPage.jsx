import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import Modal from "../../components/ui/Modal";
import CrudPage from "../../components/CrudPage";

export default function EspaciosPage() {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const loadDetail = useCallback(async (space) => setDetail(await api(`${routes.commonSpaces}/${space.id_espacio_comun}`)), []);
  useEffect(() => { if (selected) loadDetail(selected).catch(() => setDetail(null)); }, [selected, loadDetail]);
  const fields = [{ name: "nombre", label: "Nombre", required: true }, { name: "descripcion", label: "Descripción", type: "textarea", nullable: true }, { name: "capacidad", label: "Capacidad", type: "number", required: true }, { name: "id_edificio", label: "Edificio", type: "select", lookup: "buildings", optionId: "id_edificio", required: true }, { name: "activo", label: "Activo", type: "checkbox" }];
  const columns = [{ name: "id_espacio_comun", label: "ID" }, { name: "nombre", label: "Nombre" }, { name: "capacidad", label: "Capacidad" }, { name: "edificio", label: "Edificio" }];
  return <><CrudPage title="Espacios comunes" endpoint={routes.commonSpaces} idField="id_espacio_comun" fields={fields} columns={columns} renderExtraActions={(row) => <button className="mg-secondary" onClick={() => setSelected(row)}>Ver detalle</button>} /><button hidden={!selected} onClick={() => setSelected(null)}>Cerrar</button>{detail && <Modal title={detail.nombre} onClose={() => { setDetail(null); setSelected(null); }}><div className="mg-form-body"><p>{detail.descripcion}</p><p>Capacidad: {detail.capacidad}</p><p>Edificio: {detail.edificio}</p><p>{detail.activo ? "Activo" : "Inactivo"}</p></div></Modal>}</>;
}
