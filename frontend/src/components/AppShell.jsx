/* Estructura de navegación según los grupos autorizados para el usuario.
 * El menú móvil gestiona el foco y bloquea la interacción cuando está cerrado. */
import { useEffect, useRef, useState } from "react";
import Icon from "./ui/Icon";
import Button from "./ui/Button";
import { roleLabel } from "../utils/roles";
import "./shell.css";

const drawerQuery = window.matchMedia("(max-width: 760px)");

export default function AppShell({ user, groups, activePath, onNavigate, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(drawerQuery.matches);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  function toggleGroup(label) {
    setCollapsedGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  }
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const mainRef = useRef(null);

  useEffect(() => {
    function onMedia(event) {
      setIsMobile(event.matches);
      if (!event.matches) setOpen(false);
    }
    drawerQuery.addEventListener("change", onMedia);
    return () => drawerQuery.removeEventListener("change", onMedia);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    setOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !open) return;
    sidebarRef.current?.querySelector("button, a")?.focus();
  }, [open, isMobile]);

  function closeDrawer() {
    setOpen(false);
    menuButtonRef.current?.focus();
  }

  function goTo(path) {
    onNavigate(path);
    setOpen(false);
    mainRef.current?.focus();
  }

  const drawerClosed = isMobile && !open;

  return <div className="app-shell">
    <a className="shell-skip" href="#main-content">Ir al contenido</a>
    {open && <button className="shell-overlay" aria-label="Cerrar navegación" onClick={closeDrawer} />}
    <aside ref={sidebarRef} className={`shell-sidebar ${open ? "is-open" : ""}`} id="main-navigation" inert={drawerClosed} onKeyDown={(event) => { if (event.key === "Escape") closeDrawer(); }}>
      <div className="shell-brand">
        <span className="shell-brand-glyph"><Icon name="buildings" size={22} /></span>
        <div className="shell-brand-text">
          <strong>Condominio</strong>
          <small>Gestión de comunidad</small>
        </div>
      </div>
      <nav className="shell-navigation" aria-label="Navegación principal">
        {groups.map((group, index) => {
          const expanded = !collapsedGroups[group.label];
          const panelId = `navigation-group-${index}`;
          return (
          <div className="shell-nav-group" key={group.label}>
            <div className="shell-nav-heading">
              <button type="button" className="shell-nav-toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => toggleGroup(group.label)}>
                <span>{group.label}</span>
                <span className={`shell-nav-chevron ${expanded ? "is-expanded" : ""}`}>
                  <Icon name="arrow" size={16} />
                </span>
              </button>
            </div>
            <div id={panelId} className="shell-nav-items" hidden={!expanded}>
            {group.items.map((item) => {
              const current = item.path === activePath;
              return <button type="button" key={item.path} className={current ? "is-current" : undefined} aria-current={current ? "page" : undefined} onClick={() => goTo(item.path)}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </button>;
            })}
            </div>
          </div>
          );
        })}
      </nav>
      <div className="shell-account">
        <div className="shell-account-info">
          <div>
            <strong>{user.nombre} {user.apellido}</strong>
            <small>{roleLabel(user.rol)}</small>
          </div>
        </div>
        <Button variant="quiet" size="sm" block onClick={onLogout}>
          <Icon name="logout" size={17} />Cerrar sesión
        </Button>
      </div>
    </aside>
    <div className="shell-workspace">
      {isMobile && (
        <header className="shell-header">
          <button ref={menuButtonRef} type="button" className="shell-menu mg-icon-button"
            aria-label="Abrir navegación" aria-controls="main-navigation" aria-expanded={open}
            onClick={() => { if (open) closeDrawer(); else setOpen(true); }}>
            <Icon name="menu" size={24} />
          </button>
        </header>
      )}
      <main ref={mainRef} className="shell-content" id="main-content" tabIndex={-1}>{children}</main>
      <footer className="shell-footer">Condominio <span>Administración de la comunidad</span></footer>
    </div>
  </div>;
}
