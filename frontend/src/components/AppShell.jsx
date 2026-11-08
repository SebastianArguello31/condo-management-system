import { useEffect, useRef, useState } from "react";
import Icon from "./ui/Icon";
import "./shell.css";

const drawerQuery = window.matchMedia("(max-width: 760px)");

const ROLE_LABELS = { ADMIN: "Administrador", GESTOR: "Gestor", TECNICO: "Técnico", RESIDENTE: "Residente",};

export default function AppShell({ user, groups, activePath, onNavigate, onLogout, children,}) {
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
    if (!isMobile) setOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && open) {
      sidebarRef.current?.querySelector("button, a")?.focus();
    }
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
  const roleLabel = ROLE_LABELS[user.rol] || user.rol;
  const initials = (
    `${user.nombre?.[0] || ""}${user.apellido?.[0] || ""}`
  ).toUpperCase();

  return (
    <div className="app-shell">
      <a className="shell-skip" href="#main-content">
        Ir al contenido
      </a>

      {open && (
        <button
          type="button"
          className="shell-overlay"
          aria-label="Cerrar navegación"
          onClick={closeDrawer}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`shell-sidebar ${open ? "is-open" : ""}`}
        id="main-navigation"
        inert={drawerClosed}
        onKeyDown={(event) => {
          if (event.key === "Escape") closeDrawer();
        }}
      >
        <div className="shell-brand">
          <span className="shell-brand-icon">
            <Icon name="buildings" size={24} />
          </span>
          <div>
            <strong>Condominio</strong>
            <small>Gestión de comunidad</small>
          </div>
        </div>

        <nav
          className="shell-navigation"
          aria-label="Navegación principal"
        >
          {groups.map((group) => (
            <div className="shell-nav-group" key={group.label}>
              <p>{group.label}</p>

              {group.items.map((item) => {
                const current = item.path === activePath;

                return (
                  <button
                    type="button"
                    key={item.path}
                    className={current ? "is-current" : undefined}
                    aria-current={current ? "page" : undefined}
                    onClick={() => goTo(item.path)}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shell-account">
          <div className="shell-account-info">
            <span className="mg-avatar">{initials}</span>
            <div>
              <strong>{user.nombre} {user.apellido}</strong>
              <small>{roleLabel}</small>
            </div>
          </div>

          <button type="button" onClick={onLogout}>
            <Icon name="logout" size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="shell-workspace">
        <header className="shell-header">
          <button
            ref={menuButtonRef}
            type="button"
            className="shell-menu mg-icon-button"
            aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
            aria-controls="main-navigation"
            aria-expanded={open}
            onClick={() => {
              if (open) closeDrawer();
              else setOpen(true);
            }}
          >
            <Icon name="menu" />
          </button>

          <span className="shell-role">
            <span />
            {roleLabel}
          </span>
        </header>

        <main
          ref={mainRef}
          className="shell-content"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>

        <footer className="shell-footer">
          Condominio
          <span>Administración de la comunidad</span>
        </footer>
      </div>
    </div>
  );
}