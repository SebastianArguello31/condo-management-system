/* Menú por fila: botón "Más acciones" (enlace de texto) que abre el menú
 * con ítems navegables por teclado. Flechas mueven, Home/End extremos,
 * Esc cierra y devuelve el foco al botón, Tab cierra (sin interrumpir el
 * recorrido), clic fuera cierra.
 * actions: [{ label, onSelect, disabled?, danger? }]
 */
import { useEffect, useRef, useState } from "react";
import "./ui.css";

export default function RowActionsMenu({ actions = [], label = "Más acciones", className = "" }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);

  const close = (devolverFoco = false) => {
    setOpen(false);
    if (devolverFoco) trigger.current?.focus();
  };

  function items() {
    return menu.current
      ? Array.from(menu.current.querySelectorAll(".ui-menuitem:not([aria-disabled='true'])"))
      : [];
  }

  function focusItems(event) {
    const list = items();
    if (list.length === 0) return;
    event.preventDefault();
    const index = list.indexOf(document.activeElement);
    let next = null;
    if (event.key === "ArrowDown") next = list[index + 1] ?? list[0];
    if (event.key === "ArrowUp") next = list[index - 1] ?? list[list.length - 1];
    if (event.key === "Home") next = list[0];
    if (event.key === "End") next = list[list.length - 1];
    if (next) (next).focus();
  }

  useEffect(() => {
    if (!open) return undefined;

    const first = items()[0] ?? menu.current;
    first?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
      if (event.key === "Tab") close(false);
    }

    function onPointerDown(event) {
      if (!root.current?.contains(event.target)) close(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className={["ui-row-actions", className].filter(Boolean).join(" ")} ref={root}>
      <button
        type="button"
        ref={trigger}
        className="ui-row-actions-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
      </button>
      {open && (
        <div role="menu" ref={menu} className="ui-menu" onKeyDown={(event) => focusItems(event)}>
          {actions.map((action, index) => (
            <button
              type="button"
              key={action.label ?? index}
              role="menuitem"
              tabIndex={-1}
              className={["ui-menuitem", action.danger ? "ui-menuitem-danger" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-disabled={action.disabled ? "true" : undefined}
              onClick={() => {
                if (action.disabled) return;
                close(true);
                action.onSelect?.();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
