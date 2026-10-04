import { routes } from "../../services/routes";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";
import { managementConfig, recordName, roleLabels } from "./managementConfig";

export default function ManagementPage({ kind, user, onProfileUpdated }) {
  const config = managementConfig[kind];
  const deleteLabel = kind === "specialties" ? "Eliminar especialidad" : "Eliminar cuenta";
  const deleteDescription = kind === "specialties"
    ? "Se eliminará esta especialidad del catálogo. Si está asignada a empleados o tiene registros relacionados, se conservará y podrás desactivarla."
    : "Se eliminará esta cuenta y sus asignaciones laborales. Si tiene registros relacionados, se conservará y podrás desactivarla.";
  const [rows, setRows] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => Promise.all([
    api(config.endpoint), kind === "employees" ? api(`${routes.specialties}`) : Promise.resolve([]),
  ]), [config.endpoint, kind]);

  useEffect(() => {
    let active = true;
    setLoading(true); setReady(false); setError("");
    load().then(([records, catalog]) => {
      if (!active) return;
      setRows(records); setSpecialties(catalog); setReady(true);
    }).catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, reloadKey]);

  const activeCount = rows.filter((row) => row.activo).length;
  const needle = search.trim().toLocaleLowerCase();
  const filtered = rows.filter((row) => {
    const text = [recordName(row), row.email, row.telefono, row.descripcion,
      roleLabels[row.rol], ...(row.especialidades || []).map((item) => item.nombre)].join(" ").toLocaleLowerCase();
    return text.includes(needle) && (status === "all" || row.activo === (status === "active"))
      && (role === "all" || row.rol === role);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const isSelf = (row) => kind !== "specialties" && row?.id_usuario === user.id_usuario;

  function openEditor(row = null) {
    setForm(Object.fromEntries(config.fields.map((field) => [field.name,
      field.type === "password" ? "" : row?.[field.name] ?? (field.type === "checkbox" ? true : "")])));
    if (kind === "employees") setForm((value) => ({ ...value, especialidad_ids: row?.especialidad_ids || [] }));
    setEditor({ row }); setFormError("");
  }

  async function refreshAfterMutation() {
    try {
      const [records, catalog] = await load();
      setRows(records); setSpecialties(catalog); setReady(true);
    } catch (err) {
      setReady(false);
      setError(`El cambio se guardó. No se pudo actualizar el listado: ${err.message}`);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !ready || !editor) return;
    setFormError("");
    const body = {};
    for (const field of config.fields) {
      let value = form[field.name];
      if (field.name === "activo" && isSelf(editor.row)) continue;
      if (field.type === "password" && editor.row && !value) continue;
      if (typeof value === "string" && field.type !== "password") value = value.trim();
      if (field.required && value === "") { setFormError(`Completa ${field.label.toLowerCase()}.`); return; }
      if (field.type === "password" && (value.length < 8 || new TextEncoder().encode(value).length > 72)) {
        setFormError("La contraseña debe tener al menos 8 caracteres y no superar 72 bytes."); return;
      }
      body[field.name] = value;
    }
    if (kind === "employees") {
      if (!form.especialidad_ids.length) { setFormError("Selecciona al menos una especialidad laboral."); return; }
      body.especialidad_ids = form.especialidad_ids.map(Number);
    }
    setBusy(true); setNotice(""); setError("");
    try {
      const result = await api(editor.row ? `${config.endpoint}/${editor.row[config.id]}` : config.endpoint,
        { method: editor.row ? "PATCH" : "POST", body });
      if (isSelf(result)) onProfileUpdated?.(result);
      setEditor(null); setNotice("Cambios guardados correctamente.");
      await refreshAfterMutation();
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (busy || !ready || !deleting || isSelf(deleting)) return;
    setBusy(true); setFormError(""); setError(""); setNotice("");
    try {
      await api(`${config.endpoint}/${deleting[config.id]}`, { method: "DELETE" });
      setDeleting(null); setNotice(kind === "specialties" ? "Especialidad eliminada correctamente." : "Cuenta eliminada correctamente.");
      await refreshAfterMutation();
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }

  const previousIds = editor?.row?.especialidad_ids || [];
  const available = specialties.filter((item) => item.activo || previousIds.includes(item.id_especialidad));

  return <section className="management-page">
    <div className="mg-page-heading">
      <div><p className="mg-eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p>{config.description}</p></div>
      {config.create && <button className="mg-primary" disabled={!ready || busy} onClick={() => openEditor()}>
        <Icon name="plus" size={18} />{config.newLabel}</button>}
    </div>
    <div className="mg-stats">
      {[["Total de registros", rows.length, kind], ["Activos", activeCount, "check"], ["Inactivos", rows.length - activeCount, "profile"]].map(([label, count, icon]) =>
        <div className="mg-stat" key={label}><div><span>{label}</span><strong>{loading || !ready ? "—" : count}</strong></div><span className="mg-stat-icon"><Icon name={icon} size={23} /></span></div>)}
    </div>
    {error && <div className="mg-alert mg-alert-error" role="alert">{error}</div>}
    {notice && <div className="mg-alert mg-alert-success" role="status"><Icon name="check" size={18} />{notice}</div>}
    <div className="mg-panel">
      <div className="mg-toolbar">
        <label className="mg-search"><Icon name="search" size={19} /><span className="mg-sr-only">Buscar registros</span>
          <input type="search" placeholder={kind === "specialties" ? "Buscar especialidad..." : "Buscar por nombre o correo..."}
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label>
        <div className="mg-filters">
          {kind === "users" && <label><span className="mg-sr-only">Filtrar por rol</span><select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="all">Todos los roles</option>{Object.entries(roleLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
          </select></label>}
          <label><span className="mg-sr-only">Filtrar por estado</span><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
          </select></label>
          <button className="mg-icon-button" aria-label="Actualizar listado" title="Actualizar listado" disabled={loading || busy}
            onClick={() => setReloadKey((n) => n + 1)}><Icon name="refresh" size={18} /></button>
        </div>
      </div>
      {loading ? <div className="mg-empty" role="status"><span className="mg-spinner" />Cargando registros…</div>
        : !ready ? <div className="mg-empty"><Icon name="refresh" size={30} /><h2>No se pudo cargar el listado</h2>
          <p>Vuelve a consultar los datos para continuar.</p><button className="mg-primary" disabled={busy} onClick={() => setReloadKey((n) => n + 1)}>Reintentar carga</button></div>
        : <>
          <div className="mg-table-scroll"><table className="mg-table">
            <thead><tr><th>{kind === "specialties" ? "Especialidad laboral" : "Nombre"}</th>
              <th>{kind === "specialties" ? "Descripción" : kind === "employees" ? "Especialidades" : "Rol"}</th>
              {kind !== "specialties" && <th>Teléfono</th>}<th>Estado</th><th className="mg-actions-heading">Acciones</th></tr></thead>
            <tbody>{visibleRows.map((row) => <tr key={row[config.id]}>
              <td><div className="mg-identity"><span className={`mg-avatar ${kind === "specialties" ? "mg-avatar-square" : ""}`}>
                {kind === "specialties" ? <Icon name="specialties" size={20} /> : `${row.nombre?.[0] || ""}${row.apellido?.[0] || ""}`.toUpperCase()}</span>
                <div><strong>{recordName(row)}{isSelf(row) && <span className="mg-you">Tú</span>}</strong>{row.email && <span>{row.email}</span>}</div></div></td>
              <td>{kind === "specialties" ? <span className="mg-description">{row.descripcion || "Sin descripción"}</span> : kind === "employees" ?
                <div className="mg-tags">{row.especialidades?.length ? row.especialidades.map((item) => <span className="mg-tag" key={item.id_especialidad}>{item.nombre}{!item.activo && " · Inactiva"}</span>) : <span className="mg-muted">Sin asignar</span>}</div>
                : <span className="mg-role-tag">{roleLabels[row.rol] || row.rol}</span>}</td>
              {kind !== "specialties" && <td className="mg-muted">{row.telefono}</td>}
              <td><span className={`mg-status ${row.activo ? "is-active" : "is-inactive"}`}><i />{row.activo ? "Activo" : "Inactivo"}</span></td>
              <td><div className="mg-row-actions"><button className="mg-icon-button" title={`Editar ${recordName(row)}`} aria-label={`Editar ${recordName(row)}`}
                disabled={busy || (kind === "users" && isSelf(row))} onClick={() => openEditor(row)}><Icon name="edit" size={17} /></button>
                {config.remove && <button className="mg-icon-button mg-delete-button" title={`Eliminar ${recordName(row)}`} aria-label={`Eliminar ${recordName(row)}`}
                  disabled={busy || isSelf(row)} onClick={() => { setDeleting(row); setFormError(""); }}><Icon name="trash" size={17} /></button>}</div></td>
            </tr>)}</tbody>
          </table></div>
          {filtered.length === 0 && <div className="mg-empty"><Icon name="search" size={32} /><h2>{rows.length ? "Sin coincidencias" : "Todavía no hay registros"}</h2>
            <p>{rows.length ? "Prueba con otro nombre o cambia los filtros." : "Los registros aparecerán aquí cuando se creen."}</p>
            {rows.length > 0 && <button className="mg-secondary" onClick={() => { setSearch(""); setStatus("all"); setRole("all"); }}>Limpiar filtros</button>}</div>}
          <div className="mg-pagination"><span>{filtered.length ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, filtered.length)}` : "0"} de {filtered.length} registros</span>
            <div><button className="mg-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
              <span>{currentPage} / {pageCount}</span><button className="mg-secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente</button></div></div>
        </>}
    </div>
    <p className="mg-bottom-note">{kind === "specialties" ? "Puedes eliminar especialidades sin asignaciones. Desactivarlas conserva sus vínculos e impide nuevas asignaciones." :
      "Desactiva una cuenta para suspender el acceso. La eliminación definitiva solo se permite cuando no tiene registros relacionados."}</p>

    {editor && <Modal title={editor.row ? `Editar ${config.singular}` : config.newLabel}
      description={editor.row ? recordName(editor.row) + (editor.row.email ? ` · ${editor.row.email}` : "") : "Completa los datos para crear el registro."}
      busy={busy} onClose={() => setEditor(null)}>
      <form onSubmit={save}>
        <fieldset disabled={busy} className="mg-form-body">
          {formError && <div className="mg-alert mg-alert-error" role="alert">{formError}</div>}
          <div className="mg-form-grid">{config.fields.map((field) => {
            const required = field.required && !(field.type === "password" && editor.row);
            return <label key={field.name} className={field.type === "checkbox" ? "mg-check-field" : field.type === "textarea" ? "mg-full-field" : ""}>
              <span>{field.label}{required && <span className="mg-required"> *</span>}</span>
              {field.type === "textarea" ? <textarea rows={3} maxLength={field.maxLength} value={form[field.name]}
                onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} /> : field.type === "checkbox" ?
                <input type="checkbox" checked={form[field.name]} disabled={isSelf(editor.row)} onChange={(e) => setForm({ ...form, [field.name]: e.target.checked })} /> :
                <input type={field.type || "text"} required={required} maxLength={field.maxLength} minLength={field.type === "password" ? 8 : undefined}
                  autoComplete={field.type === "password" ? "new-password" : undefined} value={form[field.name]}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />}
              {field.type === "password" && <small>{editor.row ? "Déjala vacía para conservar la actual." : "Mínimo 8 caracteres."}</small>}
            </label>;
          })}</div>
          {kind === "employees" && <fieldset className="mg-specialty-picker"><legend>Especialidades laborales <span className="mg-required">*</span></legend>
            <p>Selecciona los cargos que desempeña este empleado.</p>
            <div>{available.map((item) => <label key={item.id_especialidad} className={form.especialidad_ids.includes(item.id_especialidad) ? "is-selected" : ""}>
              <input type="checkbox" checked={form.especialidad_ids.includes(item.id_especialidad)}
                onChange={(e) => setForm({ ...form, especialidad_ids: e.target.checked
                  ? [...form.especialidad_ids, item.id_especialidad] : form.especialidad_ids.filter((id) => id !== item.id_especialidad) })} />
              <span>{item.nombre}{!item.activo && <small>Inactiva · asignación existente</small>}</span>
            </label>)}</div>
            {available.length === 0 && <p className="mg-alert mg-alert-error">No hay especialidades activas. Crea o activa una en Especialidades antes de registrar empleados.</p>}
          </fieldset>}
        </fieldset>
        <footer className="mg-modal-actions"><button type="button" className="mg-secondary" disabled={busy} onClick={() => setEditor(null)}>Cancelar</button>
          <button type="submit" className="mg-primary" disabled={busy || (kind === "employees" && available.length === 0)}>{busy ? "Guardando…" : "Guardar cambios"}</button></footer>
      </form>
    </Modal>}
    {deleting && <Modal title={deleteLabel} description="Esta acción es definitiva." busy={busy} onClose={() => setDeleting(null)}>
      <div className="mg-form-body"><div className="mg-delete-summary"><Icon name="trash" size={26} /><strong>{recordName(deleting)}</strong>{deleting.email && <span>{deleting.email}</span>}</div>
        <p>{deleteDescription}</p>
        {formError && <div className="mg-alert mg-alert-error" role="alert">{formError}</div>}</div>
      <footer className="mg-modal-actions"><button className="mg-secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button>
        <button className="mg-danger" disabled={busy} onClick={remove}>{busy ? "Eliminando…" : deleteLabel}</button></footer>
    </Modal>}
  </section>;
}
