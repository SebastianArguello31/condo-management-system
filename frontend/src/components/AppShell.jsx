import { useState } from "react";
import Icon from "./ui/Icon";

const labels = { ADMIN: "Administrador", TECNICO: "Empleado", RESIDENTE: "Residente" };
const people = new Set(["users", "employees", "specialties", "admins", "residents", "residentHome", "profile"]);

export default function AppShell({ user, pages, selected, onNavigate, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const initials = `${user.nombre?.[0] || ""}${user.apellido?.[0] || ""}`.toUpperCase();
  function navigate(key) { onNavigate(key); setOpen(false); }

  return <div className="app-shell">
    <a className="shell-skip" href="#main-content">Ir al contenido</a>
    {open && <button className="shell-overlay" aria-label="Cerrar navegación" onClick={() => setOpen(false)} />}
    <aside className={`shell-sidebar ${open ? "is-open" : ""}`} id="main-navigation">
      <div className="shell-brand"><span className="shell-brand-icon"><Icon name="buildings" size={24} /></span>
        <div><strong>Condominio</strong><small>Gestión de comunidad</small></div>
      </div>
      <nav className="shell-navigation" aria-label="Navegación principal">
        {[["PERSONAS", true], ["COMUNIDAD", false]].map(([label, isPeople]) => {
          const items = pages.filter((page) => people.has(page.key) === isPeople);
          return items.length > 0 && <div className="shell-nav-group" key={label}>
            <p>{label}</p>
            {items.map(({ key, label: name }) => <button type="button" key={key}
              className={selected?.key === key ? "is-current" : ""}
              aria-current={selected?.key === key ? "page" : undefined} onClick={() => navigate(key)}>
              <Icon name={key} /><span>{name}</span>{selected?.key === key && <span className="shell-active-dot" />}
            </button>)}
          </div>;
        })}
      </nav>
      <div className="shell-account">
        <div className="shell-account-info"><span className="mg-avatar">{initials}</span>
          <div><strong>{user.nombre} {user.apellido}</strong><small>{labels[user.rol] || user.rol}</small></div>
        </div>
        <button type="button" onClick={onLogout}><Icon name="logout" size={17} />Cerrar sesión</button>
      </div>
    </aside>
    <div className="shell-workspace">
      <header className="shell-header">
        <button type="button" className="shell-menu mg-icon-button" aria-label="Abrir navegación"
          aria-controls="main-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button>
        <div className="shell-breadcrumb"><span>Panel de gestión</span><Icon name="arrow" size={14} /><strong>{selected?.label || "Inicio"}</strong></div>
        <span className="shell-role"><span />{labels[user.rol] || user.rol}</span>
      </header>
      <main className="shell-content" id="main-content" tabIndex={-1}>{children}</main>
      <footer className="shell-footer">Condominio <span>Administración de la comunidad</span></footer>
    </div>
  </div>;
}
