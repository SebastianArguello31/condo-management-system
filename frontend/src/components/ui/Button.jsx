/* Botón base (CP3). Variantes: primary, quiet, danger. busy deshabilita y
 * muestra spinner inline; block ocupa el ancho disponible.
 */
import { forwardRef } from "react";
import "./ui.css";

const Button = forwardRef(function Button(
  {
    variant = "primary",
    busy = false,
    block = false,
    type = "button",
    className = "",
    disabled = false,
    children,
    ...rest
  },
  ref
) {
  const classes = [
    "ui-btn",
    `ui-btn-${variant}`,
    block ? "ui-btn-block" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy && <span className="ui-spinner ui-spinner-inline" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
});

export default Button;
