/* AppShell "Bitácora": recibe los grupos ya resueltos para el rol
 * (config/routing.js) — sin claves de módulos ni grupos hardcodeados.
 * Ítem activo = aria-current="page" + línea de 2px a la izquierda (CSS).
 * Drawer móvil (≤760px, breakpoint legado, deuda F2-11): `inert` cuando
 * está cerrado, foco al primer ítem al abrir y de vuelta al botón de menú
 * al cerrar (overlay, Esc o toggle). Sin breadcrumb duplicado.
 * F2-12a: estilos por tokens en shell.css; marca tipográfica sin cuadro de
 * color; topbar SOLO móvil (cada pantalla tiene su h1); bloque de usuario
 * sin avatar ni píldora; "Cerrar sesión" es el Button del kit; el rol
 * viene de utils/roles.js (fuente única, compartida con el detalle de
 * cuenta). Contrato intacto: { user, groups, activePath, onNavigate,
 * onLogout, children }.
 */
import { useEffect, useRef, useState } from "react";
import Icon from "./ui/Icon";
import Button from "./ui/Button";
import { roleLabel } from "../utils/roles";
import "./shell.css";

const drawerQuery = window.matchMedia("(max-width: 760px)");

export default function AppShell({ user, groups, activePath, onNavigate, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(drawerQuery.matches);
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
    <aside ref={sidebarRef} className={`shell-sidebar ${open ? "is-open" : ""}`} id="main-navigation"
      inert={drawerClosed}
      onKeyDown={(event) => { if (event.key === "Escape") closeDrawer(); }}>
      <div className="shell-brand">
        <span className="shell-brand-glyph"><Icon name="buildings" size={22} /></span>
        <div className="shell-brand-text">
          <strong>Condominio</strong>
          <small>Gestión de comunidad</small>
        </div>
      </div>
      <nav className="shell-navigation" aria-label="Navegación principal">
        {groups.map((group) => (
          <div className="shell-nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => {
              const current = item.path === activePath;
              return <button type="button" key={item.path}
                className={current ? "is-current" : undefined}
                aria-current={current ? "page" : undefined}
                onClick={() => goTo(item.path)}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </button>;
            })}
          </div>
        ))}
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
