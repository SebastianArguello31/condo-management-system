import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";

export default function EmployeeSpecialties({ employee }) {
  const [assigned, setAssigned] = useState([]); const [catalog, setCatalog] = useState([]); const [selected, setSelected] = useState(""); const [error, setError] = useState("");
  async function load() { const [current, all] = await Promise.all([api(`${routes.employees}/${employee.id_usuario}/specialties`), api(routes.specialties)]); setAssigned(current || []); setCatalog(all || []); }
  useEffect(() => { load().catch((e) => setError(e.message)); }, [employee.id_usuario]);
  async function assign() { try { await api(`${routes.employees}/${employee.id_usuario}/specialties`, { method: "POST", body: { id_especialidad: Number(selected) } }); setSelected(""); await load(); } catch (e) { setError(e.message); } }
  async function remove(id) { try { await api(`${routes.employees}/${employee.id_usuario}/specialties/${id}`, { method: "DELETE" }); await load(); } catch (e) { setError(e.message); } }
  const available = catalog.filter((item) => item.activo && !assigned.some((a) => a.id_especialidad === item.id_especialidad));
  return <section className="mg-panel"><h2>Especialidades de {employee.nombre} {employee.apellido}</h2>{error && <p className="mg-alert mg-alert-error">{error}</p>}<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Seleccionar...</option>{available.map((item) => <option key={item.id_especialidad} value={item.id_especialidad}>{item.nombre}</option>)}</select><button className="mg-secondary" disabled={!selected} onClick={assign}>Asignar</button><ul>{assigned.map((item) => <li key={item.id_especialidad}>{item.nombre} <button className="mg-secondary" onClick={() => remove(item.id_especialidad)}>Quitar</button></li>)}</ul></section>;
}
