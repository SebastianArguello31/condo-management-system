import { Button } from "../../components/ui";
import Icon from "../../components/ui/Icon";
import "./attachments.css";

export default function AttachmentRow({ name, detail, removing = false, busy = false, disabled = false, onAction }) {
  const extension = name?.split(".").pop()?.toUpperCase();
  const label = removing ? "Quitar" : "Descargar";
  return (
    <li className="incident-attachment">
      <span className="incident-attachment-type" aria-hidden="true">
        {["JPG", "JPEG", "PNG", "PDF", "MP4", "MOV"].includes(extension) ? extension : "DOC"}
      </span>
      <div className="incident-attachment-info">
        <span className="incident-attachment-name">{name || "Adjunto"}</span>
        {detail && <span className="incident-attachment-meta">{detail}</span>}
      </div>
      <Button
        type="button"
        variant="quiet"
        className={`incident-attachment-action${removing ? " incident-attachment-remove" : ""}`}
        disabled={disabled}
        busy={busy}
        aria-label={`${label} ${name || "adjunto"}`}
        onClick={onAction}
      >
        <span className="incident-attachment-action-label">
          <Icon name={removing ? "close" : "download"} size={16} />
          {busy ? "Descargando…" : label}
        </span>
      </Button>
    </li>
  );
}
