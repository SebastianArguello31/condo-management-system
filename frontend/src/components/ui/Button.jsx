/* Botón base (CP3). Variantes: primary, quiet, danger; y aditivas (ajuste
 * F2-3): "link" — acción tipo enlace de texto, sin fondo/borde ni negrita,
 * alto de fila de tabla (--row-h); "danger-ghost" — acción destructiva
 * secundaria con texto rojo (--accent), sin borde ni fondo, hover/active
 * con el tinte danger del kit. Tamaños: "md" (por defecto) y "sm"
 * (compacto, alto de fila): combinables con cualquier variante — p. ej.
 * links y "danger-ghost" compactos en la columna Acciones de DataTable
 * (Mis reservas). busy deshabilita y muestra spinner inline; block ocupa
 * el ancho disponible.
 */
import { forwardRef } from "react";
import "./ui.css";

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
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
    size === "sm" ? "ui-btn-sm" : "",
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
