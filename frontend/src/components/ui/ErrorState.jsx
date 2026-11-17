/* Estado de error de listados/cargas: título, descripción opcional y
 * Reintentar opcional (onRetry → botón quiet).
 */
import "./ui.css";
import Button from "./Button";

export default function ErrorState({ title = "Surgió un problema", description, onRetry, className = "" }) {
  return (
    <div className={["ui-error", className].filter(Boolean).join(" ")} role="alert">
      <p className="ui-error-title">{title}</p>
      {description && <p className="ui-error-description">{description}</p>}
      {onRetry && (
        <div>
          <Button variant="quiet" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}
