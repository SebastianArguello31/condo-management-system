import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";

export default function ResidentUnits({ user }) {
  const [allUnits, setAllUnits] = useState([]); const [linked, setLinked] = useState([]); const [selected, setSelected] = useState(""); const [error, setError] = useState("");
  const endpoint = `${routes.users}/${user.id_usuario}/units`;
  async function load() { const [units, assigned] = await Promise.all([api(routes.units), api(endpoint)]); setAllUnits(units || []); setLinked(assigned || []); }
  useEffect(() => { load().catch((e) => setError(e.message)); }, [endpoint]);
  async function link() { try { await api(endpoint, { method: "POST", body: { id_unidad: Number(selected) } }); setSelected(""); await load(); } catch (e) { setError(e.message); } }
  async function unlink(id) { if (!window.confirm("¿Desvincular esta unidad?")) return; try { await api(`${endpoint}/${id}`, { method: "DELETE" }); await load(); } catch (e) { setError(e.message); } }
  const available = allUnits.filter((unit) => !linked.some((item) => item.id_unidad === unit.id_unidad));
  return <section className="mg-panel"><h2>Unidades de {user.nombre} {user.apellido}</h2>{error && <p className="mg-alert mg-alert-error">{error}</p>}<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Seleccionar unidad...</option>{available.map((unit) => <option key={unit.id_unidad} value={unit.id_unidad}>{unit.edificio} · {unit.codigo}</option>)}</select><button className="mg-secondary" disabled={!selected} onClick={link}>Vincular</button><ul>{linked.map((unit) => <li key={unit.id_unidad}>{unit.edificio} · {unit.codigo} <button className="mg-secondary" onClick={() => unlink(unit.id_unidad)}>Desvincular</button></li>)}</ul></section>;
}
