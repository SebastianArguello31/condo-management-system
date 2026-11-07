/* Buscador controlado: value + onChange(texto) + onClear() (botón "Borrar"
 * y tecla Esc). K7: la etiqueta es VISIBLE (celda idéntica a Field: label
 * arriba, control abajo) para que en la FilterBar se alinee por la base del
 * control con el resto de los campos.
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
    <div className={["ui-field", className].filter(Boolean).join(" ")}>
      <label className="ui-field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="ui-search">
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
    </div>
  );
}
