import "./ui.css";
import { useFieldControlProps } from "./Field";
import PhoneInput from "./PhoneInput";

export default function Input({
  id,
  className = "",
  "aria-describedby": describedByProp,
  "aria-invalid": invalidProp,
  ...rest
}) {
  const fieldProps = useFieldControlProps({
    id,
    "aria-describedby": describedByProp,
    "aria-invalid": invalidProp,
  });

  const isPhone =
    rest.name === "telefono" ||
    rest.type === "tel";

  if (isPhone) {
    return (
      <PhoneInput
        {...rest}
        {...fieldProps}
        autoComplete="tel"
        className={className}
      />
    );
  }

  const classes = [
    "ui-control",
    fieldProps["aria-invalid"] ? "ui-control-invalid" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <input
      {...rest}
      {...fieldProps}
      className={classes}
    />
  );
}