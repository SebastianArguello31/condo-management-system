import { useCallback, useEffect, useRef, useState } from "react";

/* Ejecuta una mutación y reutiliza su promesa mientras está en curso para evitar dobles envíos.
 * Conserva el error y lo vuelve a lanzar para que el consumidor lo gestione. */

export function useMutation(mutationFn) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(null);
  const mutationRef = useRef(mutationFn);

  useEffect(() => {
    mutationRef.current = mutationFn;
  });

  useEffect(() => {
    /* Restaura la bandera: en StrictMode (dev) la simulación de desmonte
     * ejecuta el cleanup SIN recrear los refs, así que si el flag solo se
     * ponía false en el cleanup quedaba false para siempre y el `finally`
     * saltaba el busy=false (spinner atascado). */
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
