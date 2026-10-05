import { routes } from "../../services/routes";
import { useEffect, useState } from "react";
import { api } from "../../services/api";

const profileFields = [
  { name: "nombre", label: "Nombre", type: "text", maxLength: 150 },
  { name: "apellido", label: "Apellido", type: "text", maxLength: 150 },
  { name: "email", label: "Email", type: "email", maxLength: 254 },
  { name: "telefono", label: "Teléfono", type: "text", maxLength: 40 },
];

export default function EmployeeProfile({ onProfileUpdated }) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
  });

  const [specialties, setSpecialties] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReady(false);
    setError("");

    async function loadProfile() {
      try {
        const [profile, incidentRows] = await Promise.all([
          api(`${routes.employees}/me`),
          api(routes.incidents),
        ]);

        if (!active) return;

        setForm({
          nombre: profile.nombre,
          apellido: profile.apellido,
          email: profile.email,
          telefono: profile.telefono,
        });

        setSpecialties(profile.especialidades);
        setIncidents(incidentRows || []);
        setReady(true);
      } catch (error) {
        if (active) setError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function save(event) {
    event.preventDefault();
    if (busy || !ready) return;
    setError("");
    setNotice("");

    const body = Object.fromEntries(
      profileFields.map(({ name }) => [name, form[name].trim()])
    );

    if (Object.values(body).some((value) => value === "")) {
      setError("Completá todos los campos.");
      return;
    }

    setBusy(true);

    try {
      const profile = await api(`${routes.employees}/me`, {
        method: "PATCH",
        body,
      });

      setForm({
        nombre: profile.nombre,
        apellido: profile.apellido,
        email: profile.email,
        telefono: profile.telefono,
      });

      setSpecialties(profile.especialidades);
      onProfileUpdated?.(profile);
      setNotice("Tu perfil se actualizó correctamente.");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Cargando perfil...</p>;

  return (
    <section>
      <h1>Mi perfil</h1>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}

      {!ready && <button type="button" disabled={busy}
        onClick={() => setReloadKey((value) => value + 1)}>Reintentar carga</button>}

      <form className="card" onSubmit={save}>
        <h2>Datos personales</h2>

        <fieldset disabled={busy || !ready}>
          <div className="form-grid">
            {profileFields.map((field) => (
              <label key={field.name}>
                {field.label}
                <input
                  type={field.type}
                  required
                  maxLength={field.maxLength}
                  value={form[field.name]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>

          <div className="actions">
            <button type="submit">
              {busy ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </fieldset>
      </form>

      {ready && (
        <div className="card">
          <h2>Especialidades laborales</h2>
          
          <p>Las especialidades son gestionadas por administración.</p>

          {specialties.length === 0 ? (
            <p>No tenés especialidades asignadas.</p>
          ) : (
            <ul>
              {specialties.map((specialty) => (
                <li key={specialty.id_especialidad}>
                  {specialty.nombre}
                  {!specialty.activo && " — Inactiva en el catálogo"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {ready && (
        <div className="card">
          <h2>Incidencias asignadas</h2>
          {incidents.length === 0 ? <p>No tenés incidencias asignadas.</p> : (
            <div className="mg-table-scroll"><table className="mg-table"><thead><tr>
              <th>ID</th><th>Incidencia</th><th>Unidad</th><th>Estado</th>
            </tr></thead><tbody>{incidents.map((incident) => <tr key={incident.id_incidencia}>
              <td>#{incident.id_incidencia}</td><td><strong>{incident.titulo}</strong><span className="mg-muted">{incident.tipo_incidencia}</span></td>
              <td>{incident.edificio ? `${incident.edificio} · ${incident.unidad}` : "—"}</td><td><span className={`status-badge status-${incident.estado}`}>{incident.estado}</span></td>
            </tr>)}</tbody></table></div>
          )}
        </div>
      )}
    </section>
  );
}
