import { createContext, useCallback, useContext, useMemo, useRef } from "react";

/* Confirmación asíncrona conectada al diálogo mediante useConfirmResponder.
 * Sin un diálogo registrado, resuelve false para no dejar la llamada abierta. */

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const responderRef = useRef(null);

  const register = useCallback((responder) => {
    responderRef.current = responder;
    return () => {
      if (responderRef.current === responder) responderRef.current = null;
    };
  }, []);

  const confirm = useCallback(async (options) => {
    const respond = responderRef.current;
    if (!respond) {
      if (import.meta.env.DEV) {
        console.warn("[useConfirm] Sin ConfirmDialog conectado: se resuelve false.");
      }
      return false;
    }
    return respond(options ?? {});
  }, []);

  const value = useMemo(() => ({ confirm, register }), [confirm, register]);
  return <ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>;
}

export function useConfirm() {
  const value = useContext(ConfirmContext);
  if (!value) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>.");
  return value.confirm;
}

/* Exclusivo del ConfirmDialog (CP4): devuelve register(responder), donde
 * responder(options) → Promise<boolean>. Devuelve null si no hay provider. */
export function useConfirmResponder() {
  const value = useContext(ConfirmContext);
  return value ? value.register : null;
}
