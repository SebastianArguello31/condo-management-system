import { useCallback, useEffect, useRef, useState } from "react";

/* Consulta async con cancelación y control de carreras (respuestas obsoletas).
 *
 * Comportamientos:
 * - `fetcher` recibe (signal); la consulta anterior se aborta al cambiar
 *   deps, al hacer reload o al desmontar, y en ese caso NO se escribe estado.
 * - Cambio de deps → se DESCARTA la data anterior (queda undefined mientras
 *   carga la nueva, para no mezclar resultados de listados distintos).
 * - reload() → conserva la data previa mientras re-consulta (la lista no
 *   titila a vacío).
 * - enabled=false → inactivo: no consulta, aborta la que esté en vuelo y
 *   queda { data: undefined, loading: false, error: null }; reload() tampoco
 *   consulta. Al volver a true, consulta.
 * - En fallo conserva los datos previos y expone el error de la consulta.
 * - Hoy api() aún no acepta signal (se agrega en CP6); la protección contra
 *   respuestas obsoletas funciona igual: se compara signal.aborted tras cada
 *   respuesta.
 *
 * Ejemplo:
 * const { data, loading, error, reload } = useQuery(() => api(routes.units), [], {
 *   enabled: Boolean(idEdificio),
 * });
 * if (loading) return <p>Cargando…</p>;
 */

export function useQuery(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: undefined, loading: enabled, error: null });
  const fetcherRef = useRef(fetcher);
  const enabledRef = useRef(enabled);
  const controllerRef = useRef(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    enabledRef.current = enabled;
  });

  const run = useCallback(async ({ keepPreviousData = false } = {}) => {
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({
      data: keepPreviousData ? current.data : undefined,
      loading: true,
      error: null,
    }));
    try {
      const result = await fetcherRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      if (controller.signal.aborted || err?.name === "AbortError") return;
      setState((current) => ({ ...current, loading: false, error: err }));
    }
    // deps controlan el re-lanzamiento; el fetcher vigente se lee por ref.
  }, deps);

  useEffect(() => {
    if (!enabled) {
      controllerRef.current?.abort();
      setState({ data: undefined, loading: false, error: null });
      return;
    }
    run();
    return () => controllerRef.current?.abort();
  }, [run, enabled]);

  const reload = useCallback(() => {
    if (enabledRef.current) run({ keepPreviousData: true });
  }, [run]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    reload,
  };
}
