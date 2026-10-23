/* Aviso persistente CONTROLADO: el padre decide visibilidad con `visible`
 * y recibe onDismiss al cerrarlo. danger usa role="alert"; el resto "status".
 */
import "./ui.css";

const ALIVE = {
  neutral: "status",
  muted: "status",
  info: "status",
  success: "status",
  warning: "status",
  danger: "alert",
};

export default function Alert({
  tone = "neutral",
  visible = true,
  title,
  onDismiss,
  children,
  className = "",
}) {
  if (!visible) return null;

  return (
    <div
      className={["ui-alert", `ui-alert-${tone}`, className].filter(Boolean).join(" ")}
      role={ALIVE[tone]}
    >
      <div className="ui-alert-content">
        {title && <p className="ui-alert-title">{title}</p>}
        {children && <p className="ui-alert-body">{children}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          className="ui-alert-close"
          aria-label="Cerrar aviso"
          onClick={onDismiss}
        >
          ×
        </button>
      )}
    </div>
  );
}
