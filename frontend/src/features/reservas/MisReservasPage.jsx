import CreateReservation from "./CreateReservation";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import Modal from "../../components/ui/Modal";

export default function MisReservasPage() {
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const [reservations, commonSpaces, eventTypes] = await Promise.all([
      api(routes.reservations), api(routes.commonSpaces), api(`${routes.reservations}/event-types`),
    ]);
    setRows(reservations || []); setSpaces(commonSpaces || []); setEvents(eventTypes || []);
  }, []);
  useEffect(() => { load().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [load]);
  async function openDetail(id) { try { setDetail(await api(`${routes.reservations}/${id}`)); } catch (e) { setError(e.message); } }
  async function cancel(id) { if (!window.confirm("¿Cancelar esta reserva?")) return; try { await api(`${routes.reservations}/${id}/status`, { method: "PATCH", body: { estado: "CANCELADA" } }); await load(); } catch (e) { setError(e.message); } }
  return <section className="management-page"><div className="mg-page-heading"><div><p className="mg-eyebrow">ESPACIOS COMUNES</p><h1>Mis reservas</h1></div><div><CreateReservation spaces={spaces} events={events} onCreated={load} /></div></div>{error && <div className="mg-alert mg-alert-error">{error}</div>}<div className="mg-panel">{loading ? "Cargando..." : <table className="mg-table"><thead><tr><th>ID</th><th>Fecha</th><th>Espacio</th><th>Evento</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id_reserva}><td>#{row.id_reserva}</td><td>{row.fecha}</td><td>{row.espacio}</td><td>{row.tipo_evento}</td><td>{row.estado}</td><td><button className="mg-secondary" onClick={() => openDetail(row.id_reserva)}>Detalle</button>{["PENDIENTE", "CONFIRMADA"].includes(row.estado) && <button className="mg-secondary" onClick={() => cancel(row.id_reserva)}>Cancelar</button>}</td></tr>)}</tbody></table>}</div>{detail && <Modal title={`Reserva #${detail.id_reserva}`} onClose={() => setDetail(null)}><div className="mg-form-body"><p><strong>Espacio:</strong> {detail.espacio}</p><p><strong>Tipo de evento:</strong> {detail.tipo_evento}</p><p><strong>Fecha:</strong> {detail.fecha}</p><p><strong>Horario:</strong> {detail.hora_inicio} - {detail.hora_fin}</p><p><strong>Personas:</strong> {detail.cantidad_personas}</p><p><strong>Estado:</strong> {detail.estado}</p><p>{detail.observaciones}</p></div></Modal>}</section>;
}
