/* Paginación de listado (F2-13a). Pager simple Anterior/Siguiente con el
 * conteo del rango visible; sin números de página ni selector de tamaño.
 * Renderiza NADA si pageCount <= 1 (listados cortos quedan idénticos).
 * Estructura: <nav aria-label={label}> con el texto "Mostrando {from}–{to}
 * de {total}" en aria-live="polite", el texto "Página {page} de {pageCount}"
 * y dos Button quiet sm ("Anterior"/"Siguiente", disabled en los extremos,
 * aria-label con contexto). Foco: tras pulsar, el foco se queda en el
 * botón; si el botón queda deshabilitado (extremo), el foco pasa al propio
 * <nav> (tabindex=-1, con anillo visible) para no perder el teclado.
 * Recibe filas ya cortadas: este componente no pagina ni calcula rangos.
 */
import { useEffect, useRef } from "react";
import Button from "./Button";

export default function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPrev,
  onNext,
  label,
  className = "",
}) {
  const navRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const pendiente = useRef(null);

  const manejarPrev = () => {
    pendiente.current = "prev";
    onPrev?.();
  };
  const manejarNext = () => {
    pendiente.current = "next";
    onNext?.();
  };

  /* Tras la pulsación, SI el botón pulsado quedó deshabilitado (la página
   * llegó al extremo), el foco (ya soltado por el navegador) se recoloca
   * en el <nav>. Sin pulsación pendiente, no se toca el foco. */
  useEffect(() => {
    if (!pendiente.current) return;
    const boton = pendiente.current === "prev" ? prevRef.current : nextRef.current;
    pendiente.current = null;
    if (boton?.disabled) navRef.current?.focus();
  });

  if ((pageCount ?? 0) <= 1) {
    return null;
  }

  return (
    <nav
      ref={navRef}
      tabIndex={-1}
      aria-label={label || "Paginación"}
      className={["ui-pagination", className].filter(Boolean).join(" ")}
    >
      <p className="ui-pagination-info" aria-live="polite">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="ui-pagination-botones">
        <Button
          ref={prevRef}
          variant="quiet"
          size="sm"
          disabled={page <= 1}
          aria-label="Página anterior"
          onClick={manejarPrev}
        >
          Anterior
        </Button>
        <span className="ui-pagination-pagina">
          Página {page} de {pageCount}
        </span>
        <Button
          ref={nextRef}
          variant="quiet"
          size="sm"
          disabled={page >= pageCount}
          aria-label="Página siguiente"
          onClick={manejarNext}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
