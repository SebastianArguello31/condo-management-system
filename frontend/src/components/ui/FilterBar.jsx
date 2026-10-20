/* Barra de filtros: fila flexible para SearchInput/Select/Checkbox y una
 * acción opcional "Limpiar filtros". Envolver los controles en Field para
 * etiquetas.
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
