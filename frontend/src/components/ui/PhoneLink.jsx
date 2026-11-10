import { formatPhone, phoneHref, parsePhone, } from "../../utils/phone";

export default function PhoneLink({ value, emptyText = "Sin teléfono registrado", showWhatsApp = false, }) {
  if (!value) return <span>{emptyText}</span>;

  const text = formatPhone(value);
  const href = phoneHref(value);

  if (!href) {
    return <span>{text}</span>;
  }

  if (showWhatsApp) {
    const phone = parsePhone(value);
    const whatsappNumber = phone.number.replace(/\D/g, "");

    return (
      <span className="ui-phone-contact">
        <a className="ui-phone-number" href={href} aria-label={`Llamar al ${text}`} title="Llamar al contacto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.79a2 2 0 0 1-.45 2.11L8.09 9.89a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.89.34 1.83.58 2.79.7A2 2 0 0 1 22 16.92Z" />
          </svg>
          {text}
        </a>
        <a className="ui-phone-whatsapp" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp con ${text} en una nueva pestaña`}>
          Abrir WhatsApp <span aria-hidden="true">↗</span>
        </a>
      </span>
    );
  }

  return (
    <a href={href} aria-label={`Llamar al ${text}`} style={{ whiteSpace: "nowrap" }}>
      {text}
    </a>
  );
}
