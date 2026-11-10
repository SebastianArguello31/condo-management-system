/* Botón compartido con variantes visuales y tamaños.
 * busy bloquea la acción y muestra el indicador de actividad. */
import { forwardRef } from "react";
import "./ui.css";

const Button = forwardRef(function Button(
  { variant = "primary", size = "md", busy = false, block = false, type = "button", className = "", disabled = false, children, ...rest}, ref
) {
  const classes = [
    "ui-btn",
    `ui-btn-${variant}`,
    size === "sm" ? "ui-btn-sm" : "",
    block ? "ui-btn-block" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy && <span className="ui-spinner ui-spinner-inline" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
});

export default Button;
