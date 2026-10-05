import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import Modal from "../../components/ui/Modal";

export default function CreateReservation({ spaces, events, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [availability, setAvailability] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || !form.id_espacio || !form.fecha) return;
    let active = true;
    setChecking(true); setAvailability(null); setError("");
    const params = new URLSearchParams({ fecha_inicio: form.fecha, fecha_fin: form.fecha });
    if (form.id_tipo_evento) params.set("id_tipo_evento", form.id_tipo_evento);
    api(`${routes.commonSpaces}/${form.id_espacio}/availability?${params}`).then((data) => { if (active) setAvailability(data); })
      .catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [open, form.id_espacio, form.fecha, form.id_tipo_evento]);
  function update(e) {
    const { name, value } = e.target;
    if (["id_espacio", "fecha", "id_tipo_evento"].includes(name)) setAvailability(null);
    setForm((previous) => ({ ...previous, [name]: value }));
  }
  async function save(e) {
    e.preventDefault();
    if (busy || checking || !availability?.politicas?.length) return;
    setBusy(true); setError("");
    try {
      await api(routes.reservations, { method: "POST", body: { ...form, id_espacio: Number(form.id_espacio), id_tipo_evento: Number(form.id_tipo_evento), cantidad_personas: Number(form.cantidad_personas), observaciones: (form.observaciones || "").trim() } });
      setOpen(false); await onCreated();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <>
    <button className="mg-primary" disabled={busy} onClick={() => { setForm({}); setAvailability(null); setError(""); setOpen(true); }}>Nueva reserva</button>
    {!open && error && <p role="alert">{error}</p>}
    {open && <Modal title="Nueva reserva" busy={busy} onClose={() => setOpen(false)}><form onSubmit={save}><div className="mg-form-body">
      {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
      <fieldset disabled={busy}><div className="mg-form-grid">
        <label>Espacio *<select name="id_espacio" required value={form.id_espacio || ""} onChange={update}><option value="">Seleccionar...</option>{spaces.map((s) => <option key={s.id_espacio_comun} value={s.id_espacio_comun}>{s.nombre}</option>)}</select></label>
        <label>Tipo de evento *<select name="id_tipo_evento" required value={form.id_tipo_evento || ""} onChange={update}><option value="">Seleccionar...</option>{events.map((s) => <option key={s.id_tipo_evento} value={s.id_tipo_evento}>{s.nombre}</option>)}</select></label>
        {[["fecha", "Fecha", "date"], ["hora_inicio", "Hora de inicio", "time"], ["hora_fin", "Hora de fin", "time"], ["cantidad_personas", "Personas", "number"]].map(([name, label, type]) => <label key={name}>{label} *<input required name={name} type={type} min={type === "number" ? 1 : undefined} value={form[name] || ""} onChange={update} /></label>)}
        <label>Observaciones<textarea name="observaciones" maxLength={500} value={form.observaciones || ""} onChange={update} /></label>
      </div></fieldset>
      <h3>Políticas de reserva</h3>
      {checking ? <p>Cargando políticas...</p> : !availability ? <p>Seleccioná espacio y fecha para consultar las políticas.</p> : <>
        {!availability.politicas?.length && <p>No hay políticas configuradas para este espacio.</p>}
        {availability.politicas?.map((p) => <div key={p.id_politica_reserva}><strong>{p.tipo_evento}</strong><p>Horario: {p.hora_apertura}–{p.hora_cierre}. Duración máxima: {p.duracion_max_horas} h. Aforo: {p.aforo_maximo}.</p><p>Anticipación: {p.dias_anticipacion_min}–{p.dias_anticipacion_max} días. Costo: {p.costo}. Depósito: {p.deposito_garantia}. Penalización: {p.penalizaciones}.</p></div>)}
        <h3>Horarios ocupados</h3>{availability.tramos_ocupados?.length ? <ul>{availability.tramos_ocupados.map((t) => <li key={t.id_reserva}>{t.hora_inicio}–{t.hora_fin} ({t.estado})</li>)}</ul> : <p>Sin reservas para esta fecha.</p>}
      </>}
    </div><footer className="mg-modal-actions"><button type="button" className="mg-secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button><button className="mg-primary" disabled={busy || checking || !availability?.politicas?.length}>{busy ? "Guardando..." : "Crear reserva"}</button></footer></form></Modal>}
  </>;
}
