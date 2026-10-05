import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";

export default function ManagementPage({ kind = "users" }) {
  const endpoint = kind === "employees" ? routes.employees : kind === "admins" ? routes.admins : routes.users;
  const [rows, setRows] = useState([]); const [roles, setRoles] = useState([]); const [detail, setDetail] = useState(null); const [error, setError] = useState("");
  const load = useCallback(async () => { const [records, roleRows] = await Promise.all([api(endpoint), api(`${routes.users}/roles`)]); setRows(records || []); setRoles(roleRows || []); }, [endpoint]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  async function showDetail(id) { try { setDetail(await api(`${routes.users}/${id}`)); } catch (e) { setError(e.message); } }
  async function toggle(row) { try { await api(`${routes.users}/${row.id_usuario}`, { method: "PATCH", body: { activo: !row.activo } }); await load(); } catch (e) { setError(e.message); } }
  return <section className="management-page"><h1>{kind === "employees" ? "Empleados" : kind === "admins" ? "Administradores" : "Usuarios"}</h1>{error && <div className="mg-alert mg-alert-error">{error}</div>}<div className="mg-panel"><table className="mg-table"><thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id_usuario}><td>{row.nombre} {row.apellido}</td><td>{row.email}</td><td>{row.rol || roles.find((r) => r.id_rol === row.id_rol)?.nombre || "—"}</td><td>{row.activo ? "Activo" : "Inactivo"}</td><td><button className="mg-secondary" onClick={() => showDetail(row.id_usuario)}>Detalle</button><button className="mg-secondary" onClick={() => toggle(row)}>{row.activo ? "Desactivar" : "Activar"}</button></td></tr>)}</tbody></table></div>{detail && <dialog open className="mg-modal"><h2>Detalle de usuario</h2><p>{detail.nombre} {detail.apellido}</p><p>{detail.email}</p><p>Teléfono: {detail.telefono}</p><button className="mg-secondary" onClick={() => setDetail(null)}>Cerrar</button></dialog>}</section>;
}