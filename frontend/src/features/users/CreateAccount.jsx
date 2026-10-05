import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import Modal from "../../components/ui/Modal";

const labels = { residents: "residente", employees: "empleado", admins: "administrador" };

export default function CreateAccount({ kind, onCreated }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [options, setOptions] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({});
  useEffect(() => {
    if (!open) return;
    let active = true;
    setReady(false);
    const request = kind === "residents" ? api(routes.units) : kind === "employees" ? api(routes.specialties) : Promise.resolve([]);
    request.then((rows) => { if (active) { setOptions(rows); setReady(true); } })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [open, kind]);
  async function save(event) {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true); setError("");
    try {
      if (new TextEncoder().encode(form.password).length > 72) throw new Error("La contraseña no debe superar 72 bytes.");
      const body = Object.fromEntries(["nombre", "apellido", "email", "telefono"].map((key) => [key, form[key].trim()]));
      body.password = form.password;
      if (kind === "residents") body.id_unidad = Number(form.id_unidad);
      if (kind === "employees") {
        if (!form.especialidad_ids.length) throw new Error("Seleccioná al menos una especialidad.");
        body.especialidad_ids = form.especialidad_ids.map(Number);
      }
      await api(routes[kind], { method: "POST", body });
      setOpen(false);
      await onCreated();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <button className="mg-primary" disabled={busy} onClick={() => { setForm({ especialidad_ids: [] }); setError(""); setOpen(true); }}>Nuevo {labels[kind]}</button>
    {!open && error && <p role="alert">{error}</p>}
    {open && <Modal title={`Nuevo ${labels[kind]}`} busy={busy} onClose={() => setOpen(false)}>
      <form onSubmit={save}><div className="mg-form-body">
        {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
        {!ready && !error && <p>Cargando formulario...</p>}
        <fieldset disabled={busy || !ready}><div className="mg-form-grid">
          {[["nombre", "Nombre", "text", 150], ["apellido", "Apellido", "text", 150], ["email", "Email", "email", 254], ["telefono", "Teléfono", "text", 40], ["password", "Contraseña", "password", 72]].map(([key, label, type, max]) => <label key={key}>{label} *<input required type={type} maxLength={max} minLength={key === "password" ? 8 : 1} autoComplete={key === "password" ? "new-password" : undefined} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
          {kind === "residents" && <label>Unidad inicial *<select required value={form.id_unidad || ""} onChange={(e) => setForm({ ...form, id_unidad: e.target.value })}><option value="">Seleccionar...</option>{options.map((u) => <option key={u.id_unidad} value={u.id_unidad}>{u.edificio} · {u.codigo}</option>)}</select>{ready && !options.length && <small>Primero registrá una unidad.</small>}</label>}
          {kind === "employees" && <fieldset className="mg-full-field"><legend>Especialidades *</legend>{options.filter((o) => o.activo).map((o) => <label className="mg-check-field" key={o.id_especialidad}><input type="checkbox" checked={form.especialidad_ids.includes(o.id_especialidad)} onChange={(e) => { const checked = e.target.checked; setForm((current) => ({ ...current, especialidad_ids: checked ? [...current.especialidad_ids, o.id_especialidad] : current.especialidad_ids.filter((id) => id !== o.id_especialidad) })); }} />{o.nombre}</label>)}<small>Marcá todas las especialidades que correspondan.</small></fieldset>}
        </div></fieldset></div><footer className="mg-modal-actions"><button type="button" className="mg-secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button><button className="mg-primary" disabled={busy || !ready}>{busy ? "Guardando..." : "Crear"}</button></footer></form>
    </Modal>}
  </>;
}
