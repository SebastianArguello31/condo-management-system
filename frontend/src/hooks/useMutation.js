import { useCallback, useEffect, useRef, useState } from "react";

/* Mutación async con control de doble envío y error estructurado.
 *
 * Mientras hay una llamada en curso, las demás llamadas a `run` devuelven
 * esa misma promesa (una sola ejecución real). En éxito resuelve con el
 * dato que devuelva la API; en fallo guarda el error y lo lanza: el
 * llamador decide con try/catch. `error` es el objeto lanzado por api() y,
 * cuando el backend valida, lleva `error.errors` = { campo: [mensajes] }
 * (estructura consolidada en CP6).
 *
 * Ejemplo:
 * const { run, busy, error, reset } = useMutation(
 *   (body) => api(routes.units, { method: "POST", body })
 * );
 * try {
 *   await run(form);
 * } catch (err) {
 *   // err.errors → { campo: [mensajes] }; `error` queda seteado igualmente
 * }
 */

export function useMutation(mutationFn) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(null);
  const mutationRef = useRef(mutationFn);

  useEffect(() => {
    mutationRef.current = mutationFn;
  });

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const run = useCallback((...args) => {
    if (inFlightRef.current) return inFlightRef.current;
    const call = (async () => {
      setBusy(true);
      setError(null);
      try {
        return await mutationRef.current(...args);
      } catch (err) {
        if (mountedRef.current) setError(err);
        throw err;
      } finally {
        inFlightRef.current = null;
        if (mountedRef.current) setBusy(false);
      }
    })();
    inFlightRef.current = call;
    return call;
  }, []);

  const reset = useCallback(() => {
    if (mountedRef.current) setError(null);
  }, []);

  return { run, busy, error, reset };
}
