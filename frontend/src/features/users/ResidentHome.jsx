import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function ResidentHome({ onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [units, setUnits] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", telefono: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api("/residents/me"), api("/residents/me/units"), api("/incidents")])
      .then(([resident, residentUnits, history]) => {
        if (!active) return;
        setProfile(resident);
        setForm({ nombre: resident.nombre, apellido: resident.apellido, email: resident.email, telefono: resident.telefono });
        setUnits(residentUnits);
        setIncidents(history);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await api("/residents/me", { method: "PATCH", body: form });
      setProfile(updated);
      onProfileUpdated?.(updated);
      setNotice("Perfil actualizado correctamente.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (loading) return <p role="status">Cargando perfil...</p>;
  if (!profile) return <section className="management-page"><div className="mg-alert mg-alert-error" role="alert">{error || "No se pudo cargar el perfil."}</div></section>;

  return <section className="management-page">
    <div className="mg-page-heading"><div><p className="mg-eyebrow">PORTAL DEL RESIDENTE</p><h1>Mi perfil y unidad</h1>
      <p>Consulta tus datos personales, las unidades asociadas y el historial de incidencias.</p></div></div>
    {error && <div className="mg-alert mg-alert-error" role="alert">{error}</div>}
    {notice && <div className="mg-alert mg-alert-success" role="status">{notice}</div>}
    <div className="resident-dashboard-grid">
      <form className="mg-panel resident-profile-card" onSubmit={save}>
        <div className="resident-card-heading"><h2>Datos personales</h2><span className={`mg-status ${profile.activo ? "is-active" : "is-inactive"}`}><i />{profile.activo ? "Cuenta activa" : "Cuenta inactiva"}</span></div>
        <div className="mg-form-grid">
          {[["nombre", "Nombre"], ["apellido", "Apellido"], ["email", "Correo electrónico"], ["telefono", "Teléfono"]].map(([key, label]) =>
            <label key={key}><span>{label}</span><input type={key === "email" ? "email" : "text"} required maxLength={key === "email" ? 254 : key === "telefono" ? 40 : 150}
              value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
        </div>
        <div className="resident-form-actions"><button className="mg-primary" disabled={busy}>{busy ? "Guardando..." : "Guardar perfil"}</button></div>
      </form>

      <section className="mg-panel resident-units-card"><h2>Mis unidades</h2>
        {units.length ? <ul>{units.map((unit) => <li key={unit.id_residente}>
          <strong>{unit.edificio} · {unit.unidad}</strong>
          <span>{[unit.piso && `Piso ${unit.piso}`, unit.tipo_unidad].filter(Boolean).join(" · ")}</span>
        </li>)}</ul> : <p>No tienes unidades vinculadas. Contacta con la administración.</p>}
      </section>
    </div>

    <section className="mg-panel resident-history-card">
      <div className="resident-card-heading"><div><h2>Historial de incidencias</h2><p>Solicitudes vinculadas a tu cuenta.</p></div></div>
      {incidents.length ? <div className="mg-table-scroll"><table className="mg-table">
        <thead><tr><th>Solicitud</th><th>Unidad</th><th>Tipo</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>{incidents.map((item) => <tr key={item.id_incidencia}>
          <td><strong>#{item.id_incidencia} · {item.titulo}</strong></td>
          <td>{item.edificio || "—"} · {item.unidad || "—"}</td>
          <td>{item.tipo_incidencia}</td><td><span className="mg-role-tag">{item.estado}</span></td>
          <td>{item.fecha_reporte ? new Date(item.fecha_reporte).toLocaleDateString() : "—"}</td>
        </tr>)}</tbody>
      </table></div> : <p className="resident-empty-note">Aún no tienes incidencias registradas.</p>}
      <p className="resident-empty-note">Las reservas aparecerán aquí cuando el módulo de reservas exponga su consulta de historial.</p>
    </section>
  </section>;
}
