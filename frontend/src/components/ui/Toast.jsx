/* Toasts efímeros con región aria-live. ToastProvider arriba en el árbol
 * (junto a ConfirmProvider en CP4); useToast() devuelve show(message,
 * { tone, timeout }) y los toasts se cierran solos o por botón.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import "./ui.css";

const ToastContext = createContext(null);
const DEFAULT_TIMEOUT = 4000;
let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const clearTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id) => {
      clearTimer(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer]
  );

  const show = useCallback(
    (message, { tone = "neutral", timeout = DEFAULT_TIMEOUT } = {}) => {
      toastId += 1;
      const id = toastId;
      setToasts((current) => [...current, { id, message: String(message), tone }]);
      timersRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), timeout)
      );
      return id;
    },
    [dismiss]
  );

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) window.clearTimeout(timer);
      timersRef.current.clear();
    },
    []
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ui-toast ui-toast-${toast.tone}`}>
            <span>{toast.message}</span>
            <button
              type="button"
              className="ui-toast-close"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return value.show;
}
