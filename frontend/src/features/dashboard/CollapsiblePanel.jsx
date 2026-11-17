
import { useCallback, useState } from "react";
import Icon from "../../components/ui/Icon";

const STORAGE_KEY = "dashboard.panelesContraidos";

function readCollapsed() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/* Estado abierto/cerrado por id de panel, persistido en localStorage para
 * que F5 conserve la preferencia. Por defecto todos abiertos. */
export function useCollapsedPanels() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = useCallback((id) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* sin storage: el estado vive solo en memoria */
      }
      return next;
    });
  }, []);

  const isOpen = useCallback((id) => !collapsed[id], [collapsed]);

  return { isOpen, toggle };
}

export function PanelChevron({ open }) {
  return (
    <svg
      className="dash-panel-chevron"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {open ? <path d="M6 9l6 6 6-6" /> : <path d="M15 6l-6 6 6 6" />}
    </svg>
  );
}

export function PanelToggle({ open, onToggle, controls, label }) {
  return (
    <button
      type="button"
      className="dash-panel-toggle"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? "Contraer" : "Expandir"} ${label}`}
      title={open ? "Contraer" : "Expandir"}
      onClick={onToggle}
    >
      <PanelChevron open={open} />
    </button>
  );
}

export default function CollapsiblePanel({ id, title, icon, subtitle, aside, danger = false, open, onToggle, children,}) {
  const bodyId = `dash-panel-${id}`;
  return (
    <div className={`dash-card${open ? "" : " is-collapsed"}`}>
      <div className="dash-card-header">
        {/* Atajo de mouse: el control accesible es PanelToggle. */}
        <div className="dash-card-header-text dash-panel-title-area" onClick={onToggle}>
          <h3 className={danger ? "dash-title-danger" : undefined}>
            {icon && <Icon name={icon} size={18} />}
            {title}
          </h3>
          {open && subtitle && <span className="dash-card-subtitle">{subtitle}</span>}
        </div>
        <div className="dash-card-header-side">
          {open && aside}
          <PanelToggle open={open} onToggle={onToggle} controls={bodyId} label={title} />
        </div>
      </div>
      <div id={bodyId} className="dash-panel-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}

