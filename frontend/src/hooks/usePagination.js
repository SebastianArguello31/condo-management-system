import { useCallback, useEffect, useRef, useState } from "react";

/* Divide una lista filtrada en páginas y acota la página si cambia su longitud.
 * Solo un cambio de resetKey reinicia la navegación; una recarga conserva la página válida. */

export function usePagination(rows = [], { pageSize = 10, resetKey } = {}) {
  const tamano = Math.max(1, pageSize);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / tamano));

  const [pageSinAjustar, setPageSinAjustar] = useState(1);
  const resetPrevio = useRef(resetKey);

  /* Acote (clamp) en cada render: React admite setState en fase de render
   * cuando se deriva del estado ya guardado (patrón de estado derivado);
   * si la lista encoge y deja la página fuera de rango, cae a la última
   * página VÁLIDA sin necesitar efectos sobre la identidad de `rows`. */
  const page = Math.min(Math.max(pageSinAjustar, 1), pageCount);
  if (page !== pageSinAjustar) {
    setPageSinAjustar(page);
  }

  useEffect(() => {
    if (resetKey === resetPrevio.current) return;
    resetPrevio.current = resetKey;
    setPageSinAjustar(1);
  }, [resetKey]);

  const desde = total === 0 ? 0 : (page - 1) * tamano + 1;
  const hasta = total === 0 ? 0 : Math.min(total, page * tamano);
  const pageRows = rows.slice((page - 1) * tamano, page * tamano);

  const setPage = useCallback(
    (pedida) => setPageSinAjustar(Math.min(Math.max(pedida, 1), pageCount)),
    [pageCount]
  );
  const goPrev = useCallback(
    () => setPageSinAjustar((actual) => Math.min(Math.max(actual - 1, 1), pageCount)),
    [pageCount]
  );
  const goNext = useCallback(
    () => setPageSinAjustar((actual) => Math.min(Math.max(actual + 1, 1), pageCount)),
    [pageCount]
  );

  return {
    pageRows,
    page,
    pageCount,
    total,
    from: desde,
    to: hasta,
    setPage,
    goPrev,
    goNext,
    hasPrev: page > 1,
    hasNext: page < pageCount,
  };
}
