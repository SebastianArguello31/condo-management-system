/* Estado vacío de listados: título, descripción opcional y acción opcional
 * (node, típicamente <Button variant="quiet">).
 */
import "./ui.css";

export default function EmptyState({ title, description, action, className = "" }) {
  return (
    <div className={["ui-empty", className].filter(Boolean).join(" ")}>
      <p className="ui-empty-title">{title}</p>
      {description && <p className="ui-empty-description">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
