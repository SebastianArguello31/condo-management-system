import { useCallback, useEffect, useRef, useState } from "react";

/* Consulta cancelable con protección frente a respuestas obsoletas.
 * Cambiar dependencias descarta los datos; reload los conserva. enabled=false cancela la consulta. */

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
