/* Textarea. Dentro de <Field> toma id/aria-invalid/aria-describedby
 * automáticamente; fuera del Field acepta esas props normales.
 */
import "./ui.css";
import { useFieldControlProps } from "./Field";

export default function Textarea({
  id,
  className = "",
  "aria-describedby": describedByProp,
  "aria-invalid": invalidProp,
  ...rest
}) {
  const fieldProps = useFieldControlProps({ id, "aria-describedby": describedByProp, "aria-invalid": invalidProp });
  const classes = [
    "ui-control",
    fieldProps["aria-invalid"] ? "ui-control-invalid" : "",
    className,
  ].filter(Boolean).join(" ");

  return <textarea {...rest} {...fieldProps} className={classes} />;
}
