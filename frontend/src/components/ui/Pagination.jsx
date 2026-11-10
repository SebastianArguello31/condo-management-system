/* Controles de página y rango visible; no calcula ni recorta las filas.
 * Al deshabilitarse el botón activo, devuelve el foco al contenedor de navegación. */
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
    <nav ref={navRef} tabIndex={-1} aria-label={label || "Paginación"} className={["ui-pagination", className].filter(Boolean).join(" ")}>
      <p className="ui-pagination-info" aria-live="polite">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="ui-pagination-botones">
        <Button ref={prevRef} variant="quiet" size="sm" disabled={page <= 1} aria-label="Página anterior" onClick={manejarPrev}>
          Anterior
        </Button>
        <span className="ui-pagination-pagina">
          Página {page} de {pageCount}
        </span>
        <Button ref={nextRef} variant="quiet" size="sm" disabled={page >= pageCount} aria-label="Página siguiente" onClick={manejarNext}>
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
