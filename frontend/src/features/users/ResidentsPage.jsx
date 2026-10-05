import CreateAccount from "./CreateAccount";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";
import ResidentUnits from "./ResidentUnits";

function groupResidents(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.id_usuario)) grouped.set(row.id_usuario, row);
  });
  return [...grouped.values()];
}

export default function ResidentsPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setRows(groupResidents(await api(routes.residents)));
  }, []);

  useEffect(() => { load().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter((row) => [row.nombre, row.apellido, row.email, row.telefono].join(" ").toLocaleLowerCase().includes(needle));
  }, [rows, search]);

  async function toggleStatus(row) {
    try {
      await api(`${routes.residents}/${row.id_usuario}`, { method: "PATCH", body: { activo: !row.activo } });
      setNotice(`Cuenta ${row.activo ? "desactivada" : "activada"}.`); await load();
    } catch (e) { setError(e.message); }
  }

  return <section className="management-page">
    <div className="mg-page-heading">
      <div><p className="mg-eyebrow">GESTIÓN HABITACIONAL</p><h1>Residentes</h1><p>Administra las cuentas y unidades vinculadas de cada residente.</p></div>
      <div className="mg-row-actions">
        <button className="mg-icon-button" title="Actualizar" aria-label="Actualizar" onClick={() => load().catch((e) => setError(e.message))}><Icon name="refresh" size={18} /></button>
        <CreateAccount kind="residents" onCreated={load} />
      </div>
    </div>
    {error && <div className="mg-alert mg-alert-error" role="alert">{error}</div>}{notice && <div className="mg-alert mg-alert-success" role="status">{notice}</div>}
    <div className="mg-panel"><div className="mg-toolbar"><input className="mg-search" type="search" placeholder="Buscar residente o unidad..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {loading ? <div className="mg-empty">Cargando residentes...</div> : <div className="mg-table-scroll"><table className="mg-table residents-table"><thead><tr><th>Residente</th><th>Email</th><th>Teléfono</th><th>Estado</th><th className="mg-actions-heading">Acciones</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id_usuario}><td><strong>{row.nombre} {row.apellido}</strong></td><td>{row.email}</td><td>{row.telefono}</td><td>{row.activo ? "Activo" : "Inactivo"}</td><td><div className="mg-row-actions"><button className="mg-secondary" onClick={() => setSelected(row)}>Ver unidades</button><button className="mg-secondary" onClick={() => toggleStatus(row)}>{row.activo ? "Desactivar" : "Activar"}</button></div></td></tr>)}</tbody></table>{!filtered.length && <div className="mg-empty">No hay residentes que coincidan.</div>}</div>}
    </div>
    {selected && <Modal title="Unidades del residente" description={`${selected.nombre} ${selected.apellido}`} onClose={() => setSelected(null)}><ResidentUnits user={selected} /></Modal>}
  </section>;
}
