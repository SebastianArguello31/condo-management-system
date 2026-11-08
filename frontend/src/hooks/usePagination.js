import { useCallback, useEffect, useRef, useState } from "react";

/* Paginación en cliente (F2-13a): corta una lista ya filtrada en páginas.
 *
 * Comportamientos:
 * - `rows` es la lista YA CORTADA por la pantalla (p. ej. el `filtered` de
 *   CrudPageUi); el hook solo la divide en páginas de `pageSize`.
 * - La página efectiva se ACOTA (clamp) a [1, pageCount] en cada render:
 *   si la lista encoge (búsqueda, eliminar la última fila), nunca queda
 *   una página vacía del tipo "41–50 de 38".
 * - La página vuelve a 1 SOLO cuando cambia `resetKey` (búsqueda/filtros).
 *   Un `reload()` o un refresco que mantiene `resetKey` NO la cambia, y no
 *   hay efectos que dependan de la identidad de `rows` (solo longitud/
 *   pageCount/resetKey): un array nuevo con el mismo contenido no resetea
 *   la página.
 * - Con 0 filas: pageCount 1 y from/to 0 (la lista vacía la maneja DataTable).
 *
 * Ejemplo:
 * const pag = usePagination(filtered, { pageSize: 10, resetKey: search });
 * <DataTable rows={pag.pageRows} ... />
 * <Pagination
 *   page={pag.page} pageCount={pag.pageCount} total={pag.total}
 *   from={pag.from} to={pag.to}
 *   onPrev={pag.goPrev} onNext={pag.goNext}
 *   label={`Paginación de ${title.toLowerCase()}`}
 * />
 */

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
