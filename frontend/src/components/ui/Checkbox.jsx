/* Checkbox con etiqueta a la derecha. Uso típico standalone (label como
 * prop); si se envuelve en <Field>, hereda id/aria-invalid/aria-describedby
 * del campo además de su propia etiqueta.
 */
import "./ui.css";
import { useFieldControlProps } from "./Field";

export default function Checkbox({
  label,
  id,
  className = "",
  "aria-describedby": describedByProp,
  "aria-invalid": invalidProp,
  ...rest
}) {
  const fieldProps = useFieldControlProps({ id, "aria-describedby": describedByProp, "aria-invalid": invalidProp });

  return (
    <label className={["ui-checkbox", className].filter(Boolean).join(" ")}>
      <input type="checkbox" {...rest} {...fieldProps} />
      <span>{label}</span>
    </label>
  );
}
