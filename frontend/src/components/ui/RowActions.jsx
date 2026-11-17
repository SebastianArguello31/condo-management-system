/* Acciones de fila visibles; omite las ocultas y añade children después de los botones.
 * Cada ariaLabel debe identificar el registro sobre el que actúa. */
import Button from "./Button";
import "./ui.css";

export default function RowActions({ actions = [], children, className = "" }) {
  const visibles = actions.filter((action) => !action.hidden);

  if (visibles.length === 0 && !children) return null;

  return (
    <div className={["ui-actions-inline", className].filter(Boolean).join(" ")}>
      {visibles.map((action, index) => (
        <Button key={action.label ?? index} variant={action.danger ? "danger-ghost" : "quiet"} size="sm" disabled={action.disabled} busy={action.busy} aria-label={action.ariaLabel} onClick={action.onSelect}>
          {action.label}
        </Button>
      ))}
      {children}
    </div>
  );
}
