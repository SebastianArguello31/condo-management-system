/* Aviso persistente en pantalla. tone: neutral | info | success | warning |
 * danger | muted. danger usa role="alert" (interruptivo); el resto role="status".
 * onDismiss opcional muestra el botón cerrar.
 */
import { useState } from "react";
import "./ui.css";

const ALIVE = {
  neutral: "status",
  muted: "status",
  info: "status",
  success: "status",
  warning: "status",
  danger: "alert",
};

export default function Alert({ tone = "neutral", title, onDismiss, children, className = "" }) {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

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
          onClick={() => {
            setClosed(true);
            onDismiss();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
