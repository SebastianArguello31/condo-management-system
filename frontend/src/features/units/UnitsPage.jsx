import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";

export default function UnitsPage({ buildings = false }) {
  const [detail, setDetail] = useState(null); const [error, setError] = useState("");
  const loadBuilding = useCallback(async (row) => { try { setDetail(await api(`${routes.buildings}/${row.id_edificio}`)); } catch (e) { setError(e.message); } }, []);
  useEffect(() => { if (error) window.setTimeout(() => setError(""), 4000); }, [error]);
  const endpoint = buildings ? routes.buildings : routes.units;
  const fields = buildings ? [{ name: "nombre", label: "Nombre", required: true }, { name: "direccion", label: "Dirección" }, { name: "id_tipo_edificio", label: "Tipo", type: "number", required: true }] : [{ name: "codigo", label: "Código", required: true }, { name: "piso", label: "Piso" }, { name: "id_edificio", label: "Edificio", type: "number", required: true }, { name: "id_tipo_unidad", label: "Tipo de unidad", type: "number", required: true }];
  const columns = buildings ? [{ name: "id_edificio", label: "ID" }, { name: "nombre", label: "Nombre" }, { name: "direccion", label: "Dirección" }, { name: "tipo_edificio", label: "Tipo" }] : [{ name: "id_unidad", label: "ID" }, { name: "codigo", label: "Código" }, { name: "piso", label: "Piso" }, { name: "edificio", label: "Edificio" }, { name: "tipo_unidad", label: "Tipo" }];
  return <section>{error && <p className="mg-alert mg-alert-error">{error}</p>}<CrudPage title={buildings ? "Edificios" : "Unidades"} endpoint={endpoint} idField={buildings ? "id_edificio" : "id_unidad"} fields={fields} columns={columns} renderExtraActions={buildings ? (row) => <button className="mg-secondary" onClick={() => loadBuilding(row)}>Detalle</button> : undefined} />{detail && <dialog open className="mg-modal"><h2>{detail.nombre}</h2><p>{detail.direccion}</p><p>Tipo: {detail.tipo_edificio}</p><button className="mg-secondary" onClick={() => setDetail(null)}>Cerrar</button></dialog>}</section>;
}
