/* Spinner accesible (role="status" con etiqueta oculta) y Skeleton estático
 * de líneas. Ambos se congelan con prefers-reduced-motion.
 */
import "./ui.css";

export function Spinner({ label = "Cargando…", className = "" }) {
  return (
    <span className={["ui-spinner", className].filter(Boolean).join(" ")} role="status">
      <span className="ui-visually-hidden">{label}</span>
    </span>
  );
}

export function Skeleton({ lines = 3, className = "" }) {
  return (
    <div className={["ui-skeleton", className].filter(Boolean).join(" ")} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className="ui-skeleton-line" />
      ))}
    </div>
  );
}
