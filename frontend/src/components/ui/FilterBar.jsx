/* Barra de filtros (K7): fila flexible con etiquetas visibles en TODAS las
 * celdas (envolver controles en Field; SearchInput ya trae la suya) y
 * alineación por la BASE del control; los botones quedan en esa misma línea
 * base. Acción opcional "Limpiar filtros".
 */
import "./ui.css";
import Button from "./Button";

export default function FilterBar({ onReset, children, className = "" }) {
  return (
    <div className={["ui-filterbar", className].filter(Boolean).join(" ")}>
      {children}
      {onReset && (
        <Button variant="quiet" onClick={onReset}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
