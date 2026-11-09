import {
  formatPhone,
  phoneHref,
} from "../../utils/phone";

export default function PhoneLink({
  value,
  emptyText = "Sin teléfono registrado",
}) {
  if (!value) return <span>{emptyText}</span>;

  const text = formatPhone(value);
  const href = phoneHref(value);

  if (!href) {
    return <span>{text}</span>;
  }

  return (
    <a
      href={href}
      aria-label={`Llamar al ${text}`}
      style={{ whiteSpace: "nowrap" }}
    >
      {text}
    </a>
  );
}