import { routes } from "../../services/routes";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";

export default function EmployeeSpecialties({ employee, onClose }) {
  const [assigned, setAssigned] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const endpoint = `${routes.employees}/${employee.id_usuario}/specialties`;

  const load = useCallback(async () => {
    return Promise.all([api(endpoint), api(`${routes.specialties}`)]);
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReady(false);
    setError("");
    setSelectedId("");

    load().then(([assignedRows, catalogRows]) => {
      if (!active) return;
      setAssigned(assignedRows);
      setCatalog(catalogRows);
      setReady(true);
    }).catch((error) => {
      if (active) setError(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load, reloadKey]);

  const assignedIds = new Set(assigned.map((item) => item.id_especialidad));
  const available = catalog.filter((item) => item.activo && !assignedIds.has(item.id_especialidad));

  async function refreshAfterChange() {
    try {
      const [assignedRows, catalogRows] = await load();
      setAssigned(assignedRows);
      setCatalog(catalogRows);
    } catch (error) {
      setReady(false);
      setError(`El cambio se guardó, pero no se pudo actualizar la lista. ${error.message}`);
    }
  }

  async function assign(event) {
    event.preventDefault();
    if (busy || !ready || !employee.activo) return;
    const id = Number(selectedId);
    if (!available.some((item) => item.id_especialidad === id)) {
      setError("Selecciona una especialidad disponible.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(endpoint, { method: "POST", body: { id_especialidad: id } });
      setSelectedId("");
      setNotice("Especialidad asignada.");
      await refreshAfterChange();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function unassign(specialty) {
    if (busy || !ready) return;
    if (!window.confirm(`¿Quitar la especialidad "${specialty.nombre}" de este empleado?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`${endpoint}/${specialty.id_especialidad}`, { method: "DELETE" });
      setNotice("Especialidad desvinculada.");
      await refreshAfterChange();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <h1>Especialidades del empleado</h1>
    <p>{employee.nombre} {employee.apellido} · {employee.email}</p>
    <button type="button" className="secondary" disabled={busy} onClick={onClose}>
      Volver a empleados
    </button>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}
    {!loading && !ready && <button type="button" disabled={busy}
      onClick={() => setReloadKey((value) => value + 1)}>Reintentar carga</button>}

    {loading ? <p>Cargando especialidades...</p> : <>
      {!employee.activo && <p>La cuenta está inactiva. Puedes quitar especialidades; activa la cuenta para asignar otras.</p>}
      <form className="card" onSubmit={assign}>
        <h2>Asignar especialidad</h2>
        <fieldset disabled={busy || !ready || !employee.activo || available.length === 0}>
          <label htmlFor="employee-specialty">Especialidad disponible</label>
          <select id="employee-specialty" required value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}>
            <option value="">Seleccionar...</option>
            {available.map((item) => <option key={item.id_especialidad} value={item.id_especialidad}>
              {item.nombre}
            </option>)}
          </select>
          <div className="actions">
            <button type="submit" disabled={!selectedId}>{busy ? "Procesando..." : "Asignar"}</button>
          </div>
        </fieldset>
        {ready && available.length === 0 && <p>No hay especialidades activas pendientes de asignar.</p>}
      </form>
      <div className="card table-container">
        <h2>Especialidades asignadas</h2>
        <table>
          <thead><tr><th>Especialidad</th><th>Estado del catálogo</th><th>Acciones</th></tr></thead>
          <tbody>
            {assigned.map((item) => <tr key={item.id_especialidad}>
              <td>{item.nombre}</td><td>{item.activo ? "Activa" : "Inactiva"}</td>
              <td><button type="button" className="danger" disabled={busy || !ready}
                onClick={() => unassign(item)}>Quitar</button></td>
            </tr>)}
            {ready && assigned.length === 0 && <tr><td colSpan={3}>Sin especialidades asignadas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>}
  </section>;
}
