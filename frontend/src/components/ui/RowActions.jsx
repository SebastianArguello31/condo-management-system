/* RowActions: acciones de fila como BOTONES VISIBLES dentro de
 * .ui-actions-inline (patrón de Mis reservas; decisión fijada en
 * docs/convenciones-frontend.md §8-bis). acción principal como quiet sm y
 * la destructiva como danger-ghost sm (texto rojo sin borde, hover con el
 * tinte danger). Sin estado interno: cada botón es el Button del kit con
 * size="sm".
 * API: <RowActions actions children className>. actions = [{ label,
 * onSelect, ariaLabel?, danger?, disabled?, busy?, hidden? }] — los ítems
 * hidden se OMITEN y, si no queda ninguna acción ni children, renderiza
 * null (celda vacía). children se pinta DESPUÉS de los botones (para
 * contenido adicional de la pantalla, p. ej. renderExtraActions).
 * ariaLabel va a aria-label del botón (SIEMPRE con el nombre o la fecha
 * del registro — a11y). El primer botón visible hereda el margen negativo
 * de .ui-actions-inline > :first-child (texto alineado con la cabecera).
 * Cuándo usar cada uno: RowActions para 1–3 acciones por fila; el menú de
 * fila (RowActionsMenu, patrón K6) solo con MÁS de 3.
 */
import Button from "./Button";
import "./ui.css";

export default function RowActions({ actions = [], children, className = "" }) {
  const visibles = actions.filter((action) => !action.hidden);

  if (visibles.length === 0 && !children) return null;

  return (
    <div className={["ui-actions-inline", className].filter(Boolean).join(" ")}>
      {visibles.map((action, index) => (
        <Button
          key={action.label ?? index}
          variant={action.danger ? "danger-ghost" : "quiet"}
          size="sm"
          disabled={action.disabled}
          busy={action.busy}
          aria-label={action.ariaLabel}
          onClick={action.onSelect}
        >
          {action.label}
        </Button>
      ))}
      {children}
    </div>
  );
}
