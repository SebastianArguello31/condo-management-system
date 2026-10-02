import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";

export default function Modal({ title, description, busy, onClose, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="mg-modal" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="mg-modal-heading">
      <div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div>
      <button type="button" className="mg-icon-button" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}>
        <Icon name="close" />
      </button>
    </header>
    {children}
  </dialog>;
}
