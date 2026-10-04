import { routes } from "../../services/routes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import Icon from "../../components/ui/Icon";

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "RECHAZADA", "CANCELADA", "FINALIZADA"];
const ESTADOS_CANCELABLES = ["PENDIENTE", "CONFIRMADA"];
const ESTADOS_APROBAR = ["PENDIENTE"];

const EMPTY_FILTERS = { espacio: "", estado: "", fecha: "", residente: "" };

export default function GestionReservasPage() {
  const [rows, setRows] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.espacio) params.set("espacio", filters.espacio);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.fecha) params.set("fecha", filters.fecha);
    if (filters.residente) params.set("residente", filters.residente);
    const query = params.toString();
    const [reservas, espacios] = await Promise.all([
      api(`${routes.reservations}${query ? `?${query}` : ""}`),
      api(`${routes.commonSpaces}`),
    ]);
    setRows(reservas || []);
    setEspacios(espacios || []);
  }, [filters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    load()
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  async function cancelar(row) {
    if (!window.confirm(`¿Cancelar la reserva #${row.id_reserva}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`${routes.reservations}/${row.id_reserva}/status`, { method: "PATCH", body: { estado: "CANCELADA" } });
      setNotice(`Reserva #${row.id_reserva} cancelada.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function aprobar(row) {
    if (!window.confirm(`¿Aprobar la reserva #${row.id_reserva}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`${routes.reservations}/${row.id_reserva}/status`, { method: "PATCH", body: { estado: "CONFIRMADA" } });
      setNotice(`Reserva #${row.id_reserva} aprobada.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function rechazar(row) {
    if (!window.confirm(`¿Rechazar la reserva #${row.id_reserva}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`${routes.reservations}/${row.id_reserva}/status`, { method: "PATCH", body: { estado: "RECHAZADA" } });
      setNotice(`Reserva #${row.id_reserva} rechazada.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filteredRows = useMemo(() => rows, [rows]);

  return (
    <section className="management-page">
      <div className="mg-page-heading">
        <div>
          <p className="mg-eyebrow">GESTIÓN OPERATIVA</p>
          <h1>Gestión de reservas</h1>
          <p>Revisá todas las reservas del condominio, filtrá por espacio, estado, fecha o residente, y cancelá las que correspondan.</p>
        </div>
        <button className="mg-icon-button" title="Actualizar listado" aria-label="Actualizar listado" disabled={loading || busy} onClick={() => { setError(""); setNotice(""); load(); }}>
          <Icon name="refresh" size={18} />
        </button>
      </div>

      {error && <div className="mg-alert mg-alert-error" role="alert">{error}</div>}
      {notice && <div className="mg-alert mg-alert-success" role="status">{notice}</div>}

      <div className="mg-panel">
        <div className="mg-toolbar">
          <div className="mg-filters">
            <label>
              <span className="mg-sr-only">Filtrar por espacio</span>
              <select name="espacio" value={filters.espacio} onChange={updateFilter}>
                <option value="">Todos los espacios</option>
                {espacios.map((espacio) => (
                  <option key={espacio.id_espacio_comun} value={espacio.id_espacio_comun}>
                    {espacio.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mg-sr-only">Filtrar por estado</span>
              <select name="estado" value={filters.estado} onChange={updateFilter}>
                <option value="">Todos los estados</option>
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mg-sr-only">Filtrar por fecha</span>
              <input type="date" name="fecha" value={filters.fecha} onChange={updateFilter} />
            </label>
            <label>
              <span className="mg-sr-only">Filtrar por residente (ID de usuario)</span>
              <input type="number" name="residente" placeholder="ID de usuario" value={filters.residente} onChange={updateFilter} />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="mg-empty" role="status">Cargando reservas...</div>
        ) : filteredRows.length === 0 ? (
          <div className="mg-empty">
            <h2>Sin reservas</h2>
            <p>No hay reservas que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="mg-table-scroll">
            <table className="mg-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Espacio</th>
                  <th>Residente</th>
                  <th>Tipo de evento</th>
                  <th>Horario</th>
                  <th>Personas</th>
                  <th>Estado</th>
                  <th className="mg-actions-heading">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id_reserva}>
                    <td className="mg-muted">#{row.id_reserva}</td>
                    <td className="mg-muted">{row.fecha}</td>
                    <td><strong>{row.espacio}</strong></td>
                    <td>{row.residente_nombre} {row.residente_apellido}</td>
                    <td className="mg-muted">{row.tipo_evento}</td>
                    <td>{row.hora_inicio} - {row.hora_fin}</td>
                    <td>{row.cantidad_personas}</td>
                    <td><span className={`status-badge status-${row.estado}`}>{row.estado}</span></td>
                    <td>
                      <div className="mg-row-actions">
                        {ESTADOS_CANCELABLES.includes(row.estado) && (
                          <button type="button" className="mg-icon-button" title="Cancelar reserva" aria-label="Cancelar reserva" disabled={busy} onClick={() => cancelar(row)}>
                            <Icon name="trash" size={18} />
                          </button>
                        )}
                        {row.estado === "PENDIENTE" && (
                          <>
                            <button type="button" className="mg-icon-button" title="Aprobar reserva" aria-label="Aprobar reserva" disabled={busy} onClick={() => aprobar(row)}>
                              <Icon name="check" size={18} />
                            </button>
                            <button type="button" className="mg-icon-button" title="Rechazar reserva" aria-label="Rechazar reserva" disabled={busy} onClick={() => rechazar(row)}>
                              <Icon name="trash" size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
