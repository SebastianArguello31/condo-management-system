/* Modal basado en <dialog> nativo (Esc, foco atrapado y devuelto gratis).
 * Ampliado: footer de acciones, backdrop opt-in (overlay solo si backdrop
 * con click para cerrar) y id de título forzable con labelledBy.
 * API previo compatible: title, description, busy, onClose, children.
 */
import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";

export default function Modal({
  title,
  description,
  busy = false,
  onClose,
  footer,
  backdrop = false,
  labelledBy,
  children,
}) {
  const dialog = useRef(null);
  const titleId = useId();
  const headingId = labelledBy ?? titleId;

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="mg-modal ui-modal"
      data-backdrop={backdrop ? "true" : undefined}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (backdrop && !busy && event.target === dialog.current) onClose();
      }}
    >
      <header className="mg-modal-heading ui-modal-heading">
        <div>
          <h2 id={headingId} className="ui-modal-title">{title}</h2>
          {description && <p className="ui-modal-desc">{description}</p>}
        </div>
        <button
          type="button"
          className="mg-icon-button ui-modal-close"
          aria-label="Cerrar ventana"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="ui-modal-body">{children}</div>
      {footer && <footer className="ui-modal-footer">{footer}</footer>}
    </dialog>
  );
}
