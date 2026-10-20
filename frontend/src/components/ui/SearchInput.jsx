/* Buscador controlado: value + onChange(texto) + onClear() (botón "Borrar"
 * y tecla Esc). Etiqueta oculta accesible con label (aria).
 */
import { useId } from "react";
import "./ui.css";

export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Buscar…",
  label = "Buscar",
  id,
  className = "",
  ...rest
}) {
  const localId = useId();
  const inputId = id ?? localId;

  return (
    <div className={["ui-search", className].filter(Boolean).join(" ")}>
      <label className="ui-visually-hidden" htmlFor={inputId}>
        {label}
      </label>
      <input
        type="search"
        id={inputId}
        className="ui-control"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value && onClear) {
            event.stopPropagation();
            onClear();
          }
        }}
        {...rest}
      />
      {value !== "" && onClear && (
        <button type="button" className="ui-search-clear" onClick={onClear}>
          Borrar
        </button>
      )}
    </div>
  );
}
