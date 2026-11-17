/* Campo con etiqueta, ayuda y error por campo: reparte id y
 * aria-invalid/aria-describedby a su control (Input, Select, Textarea o
 * Checkbox) vía contexto; un solo control por Field.
 */
import { createContext, useContext, useId, useMemo } from "react";
import "./ui.css";

const FieldContext = createContext(null);

export { FieldContext as FieldProviderContext };

/* Interno de los controles: resuelve id, aria-describedby y aria-invalid
 * combinando el contexto del Field padre con las props del control.
 */
export function useFieldControlProps({
  id,
  "aria-describedby": describedByProp,
  "aria-invalid": invalidProp,
}) {
  const field = useContext(FieldContext);
  const localId = useId();
  return {
    id: field?.id ?? id ?? localId,
    "aria-describedby": field?.describedBy ?? describedByProp,
    "aria-invalid": (field ? field.invalid : Boolean(invalidProp)) || undefined,
  };
}

export default function Field({ label, required = false, error, help, children, className = "" }) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const context = useMemo(
    () => ({ id, invalid: Boolean(error), describedBy }),
    [id, error, describedBy]
  );

  return (
    <div className={["ui-field", className].filter(Boolean).join(" ")}>
      <label className="ui-field-label" htmlFor={id}>
        {label}
        {required && (
          <>
            <span className="ui-field-required" aria-hidden="true">
              {" *"}
            </span>
            <span className="ui-visually-hidden"> (obligatorio)</span>
          </>
        )}
      </label>
      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>
      {help && (
        <p className="ui-field-help" id={helpId}>
          {help}
        </p>
      )}
      {error && <p className="ui-field-error" id={errorId}>{error}</p>}
    </div>
  );
}
