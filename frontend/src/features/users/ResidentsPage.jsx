import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";

const EMPTY = {
  nombre: "", apellido: "", email: "", telefono: "", password: "",
  activo: true, id_unidad: "",
};

function groupResidents(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.id_usuario) || { ...row, unidades: [] };
    if (row.id_unidad && !current.unidades.some((unit) => unit.id_unidad === row.id_unidad)) {
      current.unidades.push(row);
    }
    grouped.set(row.id_usuario, current);
  }
  return [...grouped.values()];
}

export default function ResidentsPage() {
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [editor, setEditor] = useState(undefined);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [residentRows, unitRows] = await Promise.all([
      api("/residents"), api("/units"),
    ]);
    setRows(groupResidents(residentRows));
    setUnits(unitRows);
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([api("/residents"), api("/units")])
      .then(([residentRows, unitRows]) => {
        if (!active) return;
        setRows(groupResidents(residentRows));
        setUnits(unitRows);
        setReady(true);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const haystack = [row.nombre, row.apellido, row.email, row.telefono,
        ...row.unidades.map((unit) => `${unit.edificio} ${unit.unidad}`)]
        .join(" ").toLocaleLowerCase();
      return haystack.includes(needle)
        && (status === "all" || row.activo === (status === "active"));
    });
  }, [rows, search, status]);

  function openEditor(row = null) {
    setEditor(row);
    setForm(row ? {
      nombre: row.nombre || "", apellido: row.apellido || "",
      email: row.email || "", telefono: row.telefono || "", password: "",
      activo: row.activo, id_unidad: "",
    } : { ...EMPTY });
    setFormError("");
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !ready) return;
    setFormError("");
    const body = {};
    for (const key of ["nombre", "apellido", "email", "telefono"]) {
      body[key] = form[key].trim();
      if (!body[key]) {
        setFormError("Completa todos los datos personales.");
        return;
      }
    }
    if (!editor) {
      if (!form.password) {
        setFormError("Ingresa una contraseña para la cuenta.");
        return;
      }
      if (form.password.length < 8 || new TextEncoder().encode(form.password).length > 72) {
        setFormError("La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.");
        return;
      }
      if (!form.id_unidad) {
        setFormError("Selecciona la unidad del residente.");
        return;
      }
      body.password = form.password;
      body.activo = form.activo;
      body.id_unidad = Number(form.id_unidad);
    } else {
      body.activo = form.activo;
      if (form.id_unidad) body.id_unidad = Number(form.id_unidad);
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(editor ? `/residents/${editor.id_usuario}` : "/residents", {
        method: editor ? "PATCH" : "POST", body,
      });
      setEditor(undefined);
      setNotice(editor ? "Residente actualizado." : "Residente registrado.");
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(row) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/residents/${row.id_usuario}`, {
        method: "PATCH", body: { activo: !row.activo },
      });
      setNotice(`Cuenta ${row.activo ? "desactivada" : "activada"}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const activeCount = rows.filter((row) => row.activo).length;

  return <section className="management-page">
    <div className="mg-page-heading">
      <div><p className="mg-eyebrow">GESTIÓN HABITACIONAL</p><h1>Residentes</h1>
        <p>Administra las cuentas de residentes y sus vínculos con las unidades.</p></div>
      <button className="mg-primary" disabled={!ready || busy} onClick={() => openEditor()}>
        <Icon name="plus" size={18} />Nuevo residente
      </button>
    </div>

    <div className="mg-stats">
      {[["Residentes", rows.length], ["Activos", activeCount], ["Inactivos", rows.length - activeCount]].map(([label, count]) =>
        <div className="mg-stat" key={label}><div><span>{label}</span><strong>{loading || !ready ? "—" : count}</strong></div>
          <span className="mg-stat-icon"><Icon name="residents" size={23} /></span></div>)}
    </div>

    {error && <div className="mg-alert mg-alert-error" role="alert">{error}</div>}
    {notice && <div className="mg-alert mg-alert-success" role="status">{notice}</div>}

    <div className="mg-panel">
      <div className="mg-toolbar">
        <label className="mg-search"><Icon name="search" size={19} />
          <span className="mg-sr-only">Buscar residentes</span>
          <input type="search" placeholder="Buscar residente, correo o unidad..."
            value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="mg-filters">
          <label><span className="mg-sr-only">Filtrar por estado</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option><option value="inactive">Inactivos</option>
            </select>
          </label>
          <button className="mg-icon-button" title="Actualizar" aria-label="Actualizar listado"
            disabled={loading || busy} onClick={() => { setLoading(true); load().catch((err) => setError(err.message)).finally(() => setLoading(false)); }}>
            <Icon name="refresh" size={18} />
          </button>
        </div>
      </div>
      {loading ? <div className="mg-empty" role="status">Cargando residentes...</div>
        : !ready ? <div className="mg-empty"><h2>No se pudo cargar el listado</h2>
          <button className="mg-primary" onClick={() => { setLoading(true); load().catch((err) => setError(err.message)).finally(() => setLoading(false)); }}>Reintentar</button></div>
        : <div className="mg-table-scroll"><table className="mg-table">
          <thead><tr><th>Residente</th><th>Unidad(es)</th><th>Teléfono</th><th>Estado</th><th className="mg-actions-heading">Acciones</th></tr></thead>
          <tbody>{filtered.map((row) => <tr key={row.id_usuario}>
            <td><div className="mg-identity"><span className="mg-avatar">{`${row.nombre?.[0] || ""}${row.apellido?.[0] || ""}`.toUpperCase()}</span>
              <div><strong>{row.nombre} {row.apellido}</strong><span>{row.email}</span></div></div></td>
            <td>{row.unidades.length ? row.unidades.map((unit) => <span className="mg-tag" key={unit.id_unidad}>{unit.edificio} · {unit.unidad}</span>) : <span className="mg-muted">Sin unidad</span>}</td>
            <td className="mg-muted">{row.telefono}</td>
            <td><span className={`mg-status ${row.activo ? "is-active" : "is-inactive"}`}><i />{row.activo ? "Activo" : "Inactivo"}</span></td>
            <td><div className="mg-row-actions">
              <button className="mg-icon-button" title="Editar residente" aria-label="Editar residente" disabled={busy} onClick={() => openEditor(row)}><Icon name="edit" size={17} /></button>
              <button className="mg-icon-button" title={row.activo ? "Desactivar" : "Activar"} aria-label={row.activo ? "Desactivar residente" : "Activar residente"} disabled={busy} onClick={() => toggleStatus(row)}><Icon name={row.activo ? "lock" : "check"} size={17} /></button>
            </div></td>
          </tr>)}</tbody>
        </table>{filtered.length === 0 && <div className="mg-empty"><h2>{rows.length ? "Sin coincidencias" : "Aún no hay residentes"}</h2><p>Los residentes registrados aparecerán aquí.</p></div>}</div>}
    </div>

    {editor !== undefined && <Modal title={editor ? "Editar residente" : "Nuevo residente"}
      description={editor ? `${editor.nombre} ${editor.apellido}` : "La cuenta y su unidad se registran en una sola operación."}
      busy={busy} onClose={() => setEditor(undefined)}>
      <ResidentForm form={form} setForm={setForm} units={units} editing={Boolean(editor)}
        onSubmit={save} onCancel={() => setEditor(undefined)} busy={busy} error={formError} />
    </Modal>}
  </section>;
}

function ResidentForm({ form, setForm, units, editing = false, onSubmit, onCancel, busy, error }) {
  const field = (name, label, type = "text", required = true, maxLength) => <label key={name}>
    <span>{label}{required && <span className="mg-required"> *</span>}</span>
    <input type={type} required={required} maxLength={maxLength} value={form[name]}
      autoComplete={name === "password" ? "new-password" : undefined}
      minLength={name === "password" ? 8 : undefined}
      onChange={(event) => setForm({ ...form, [name]: event.target.value })} />
  </label>;

  return <form onSubmit={onSubmit}>
    <fieldset disabled={busy} className="mg-form-body">
      {error && <div className="mg-alert mg-alert-error" role="alert">{error}</div>}
      <div className="mg-form-grid">
        {field("nombre", "Nombre", "text", true, 150)}
        {field("apellido", "Apellido", "text", true, 150)}
        {field("email", "Correo electrónico", "email", true, 254)}
        {field("telefono", "Teléfono", "text", true, 40)}
        {!editing && field("password", "Contraseña", "password", true)}
        <label className="mg-full-field"><span>Unidad{!editing && <span className="mg-required"> *</span>}</span>
          <select required={!editing} value={form.id_unidad} onChange={(event) => setForm({ ...form, id_unidad: event.target.value })}>
            <option value="">{editing ? "Sin cambios de unidad" : "Seleccionar unidad..."}</option>
            {units.map((unit) => <option key={unit.id_unidad} value={unit.id_unidad}>{unit.edificio} · {unit.codigo}{unit.piso ? ` · Piso ${unit.piso}` : ""}</option>)}
          </select>
        </label>
        <label className="mg-check-field mg-full-field"><span>Cuenta activa</span>
          <input type="checkbox" checked={form.activo} onChange={(event) => setForm({ ...form, activo: event.target.checked })} />
        </label>
      </div>
      {units.length === 0 && <p className="mg-alert mg-alert-error">Registra una unidad antes de crear un residente.</p>}
    </fieldset>
    <footer className="mg-modal-actions">
      <button type="button" className="mg-secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
      <button type="submit" className="mg-primary" disabled={busy || units.length === 0}>{busy ? "Guardando..." : "Guardar"}</button>
    </footer>
  </form>;
}
