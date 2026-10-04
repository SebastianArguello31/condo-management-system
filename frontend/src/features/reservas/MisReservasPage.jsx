import { routes } from "../../services/routes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";

const EMPTY_FORM = {
  id_espacio: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  cantidad_personas: "",
  id_tipo_evento: "",
  observaciones: "",
};

const ESTADOS_CANCELABLES = ["PENDIENTE", "CONFIRMADA"];

export default function MisReservasPage() {
  const [rows, setRows] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [disponibilidad, setDisponibilidad] = useState(null);

  const load = useCallback(async () => {
    const [reservas, espacios, tipos] = await Promise.all([
      api(`${routes.reservations}`),
      api(`${routes.commonSpaces}`),
      api(`${routes.reservations}/event-types`),
    ]);
    setRows(reservas || []);
    setEspacios(espacios || []);
    setTipos(tipos || []);
  }, []);

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

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  useEffect(() => {
    if (!form.id_espacio || !form.fecha) {
      setDisponibilidad(null);
      return;
    }
    let active = true;
    setDisponibilidad(null);
    api(`${routes.commonSpaces}/${form.id_espacio}/availability?fecha_inicio=${form.fecha}&fecha_fin=${form.fecha}${form.id_tipo_evento ? `&id_tipo_evento=${form.id_tipo_evento}` : ""}`)
      .then((data) => {
        if (active) setDisponibilidad(data);
      })
      .catch((err) => {
        if (active) { setDisponibilidad(null); setError(err.message); }
      });
    return () => {
      active = false;
    };
  }, [form.id_espacio, form.fecha, form.id_tipo_evento]);

  async function submitCreate(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = {
        id_espacio: Number(form.id_espacio),
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        cantidad_personas: Number(form.cantidad_personas),
        id_tipo_evento: Number(form.id_tipo_evento),
        observaciones: form.observaciones.trim(),
      };
      await api(`${routes.reservations}`, { method: "POST", body });
      setNotice("Reserva creada correctamente.");
      setForm({ ...EMPTY_FORM });
      setDisponibilidad(null);
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelar(row) {
    if (!window.confirm("¿Seguro que deseas cancelar esta reserva?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`${routes.reservations}/${row.id_reserva}/status`, { method: "PATCH", body: { estado: "CANCELADA" } });
      setNotice("Reserva cancelada.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const politicas = disponibilidad?.politicas || [];
  const tramos = disponibilidad?.tramos_ocupados || [];

  return (
    <section className="management-page">
      <div className="mg-page-heading">
        <div>
          <p className="mg-eyebrow">MI CONDOMINIO</p>
          <h1>Mis reservas</h1>
          <p>Consultá tu historial de reservas y creá nuevas solicitudes de espacios comunes.</p>
        </div>
        <button className="mg-primary" disabled={busy} onClick={() => { setShowCreate(true); setError(""); setNotice(""); }}>
          <Icon name="plus" size={18} />
          Nueva reserva
        </button>
      </div>

      {error && <div className="mg-alert mg-alert-error" role="alert">{error}</div>}
      {notice && <div className="mg-alert mg-alert-success" role="status">{notice}</div>}

      <div className="mg-panel">
        {loading ? (
          <div className="mg-empty" role="status">Cargando reservas...</div>
        ) : rows.length === 0 ? (
          <div className="mg-empty">
            <h2>No tenés reservas aún</h2>
            <p>Creá tu primera reserva de espacio común con el botón "Nueva reserva".</p>
          </div>
        ) : (
          <div className="mg-table-scroll">
            <table className="mg-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Espacio</th>
                  <th>Tipo de evento</th>
                  <th>Horario</th>
                  <th>Personas</th>
                  <th>Estado</th>
                  <th className="mg-actions-heading">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id_reserva}>
                    <td className="mg-muted">{row.fecha}</td>
                    <td><strong>{row.espacio}</strong></td>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Nueva reserva" description="Completá los datos del espacio que querés reservar." busy={busy} onClose={() => setShowCreate(false)}>
          <form onSubmit={submitCreate}>
            <div className="mg-form-body">
              {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
              <fieldset disabled={busy}>
                <div className="mg-form-grid">
                  <label>
                    <span>Espacio <span className="mg-required">*</span></span>
                    <select name="id_espacio" required value={form.id_espacio} onChange={updateField}>
                      <option value="">Seleccionar...</option>
                      {espacios.map((espacio) => (
                        <option key={espacio.id_espacio_comun} value={espacio.id_espacio_comun}>
                          {espacio.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Fecha <span className="mg-required">*</span></span>
                    <input type="date" name="fecha" required value={form.fecha} onChange={updateField} />
                  </label>
                  <label>
                    <span>Hora de inicio <span className="mg-required">*</span></span>
                    <input type="time" name="hora_inicio" required value={form.hora_inicio} onChange={updateField} />
                  </label>
                  <label>
                    <span>Hora de fin <span className="mg-required">*</span></span>
                    <input type="time" name="hora_fin" required value={form.hora_fin} onChange={updateField} />
                  </label>
                  <label>
                    <span>Cantidad de personas <span className="mg-required">*</span></span>
                    <input type="number" name="cantidad_personas" required min="1" value={form.cantidad_personas} onChange={updateField} />
                  </label>
                  <label>
                    <span>Tipo de evento <span className="mg-required">*</span></span>
                    <select name="id_tipo_evento" required value={form.id_tipo_evento} onChange={updateField}>
                      <option value="">Seleccionar...</option>
                      {tipos.map((tipo) => (
                        <option key={tipo.id_tipo_evento} value={tipo.id_tipo_evento}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mg-full-field">
                    <span>Observaciones</span>
                    <textarea name="observaciones" rows="2" maxLength="500" value={form.observaciones} onChange={updateField} />
                  </label>
                </div>
              </fieldset>

              {disponibilidad && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#475c55" }}>Disponibilidad del espacio</h4>
                  {politicas.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {politicas.map((politica) => (
                        <li key={politica.id_politica_reserva} className="mg-tag" style={{ fontSize: 12 }}>
                          {politica.tipo_evento}: {politica.hora_apertura}-{politica.hora_cierre} · máx {politica.duracion_max_horas}h · aforo {politica.aforo_maximo}
                        </li>
                      ))}
                    </ul>
                  )}
                  {tramos.length > 0 ? (
                    <div>
                      <small style={{ color: "#7c8d92", display: "block", marginBottom: 4 }}>Tramos ocupados en la fecha:</small>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {tramos.map((tramo) => (
                          <li key={tramo.id_reserva} className="status-badge status-CONFIRMADA" style={{ fontSize: 12 }}>
                            {tramo.hora_inicio} - {tramo.hora_fin} ({tramo.estado})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mg-muted" style={{ fontSize: 12, margin: 0 }}>Sin tramos ocupados en la fecha seleccionada.</p>
                  )}
                </div>
              )}
            </div>

            <div className="mg-modal-actions">
              <button type="button" className="mg-secondary" disabled={busy} onClick={() => setShowCreate(false)}>Cancelar</button>
              <button type="submit" className="mg-primary" disabled={busy || !disponibilidad?.politicas?.length}>{busy ? "Guardando..." : "Crear reserva"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
