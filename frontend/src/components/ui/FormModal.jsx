/* Formulario en modal con errores de acción y por campo; bloquea el cierre durante el envío.
 * El padre comunica el éxito. showRequiredNote añade la nota de campos obligatorios. */
import { createContext, useContext, useEffect, useId, useRef } from "react";
import Modal from "./Modal";
import Button from "./Button";
import Alert from "./Alert";
import "./ui.css";

const FormErrorsContext = createContext(null);

/* Hook para los hijos: message del campo o undefined. Pattern previsto:
 *   const error = useFormFieldError("email");
 *   <Field label="Email" error={error}><Input name="email" /></Field>
 */
export function useFormFieldError(name) {
  const fieldErrors = useContext(FormErrorsContext);
  return fieldErrors?.[name] ?? undefined;
}

export default function FormModal({
  title,
  description,
  open,
  busy = false,
  error,
  fieldErrors = null,
  showRequiredNote = false,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  onSubmit,
  onClose,
  children,
}) {
  const alertRef = useRef(null);
  const notaId = useId();

  useEffect(() => {
    if (open && error) {
      alertRef.current?.focus({ preventScroll: false });
      alertRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [open, error]);

  if (!open) return null;

  return (
    <Modal title={title} description={description} busy={busy} onClose={onClose} backdrop>
      <form noValidate aria-describedby={showRequiredNote ? notaId : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          onSubmit?.(event);
        }}
      >
        <div className="ui-modal-body">
          {error && (
            <div ref={alertRef} tabIndex={-1}>
              <Alert tone="danger" title="No se pudo completar la acción">
                {error}
              </Alert>
            </div>
          )}
          {showRequiredNote && (
            <p id={notaId} className="ui-form-required">
              Los campos marcados con * son obligatorios.
            </p>
          )}
          <FormErrorsContext.Provider value={fieldErrors}>{children}</FormErrorsContext.Provider>
        </div>
        <footer className="ui-modal-footer">
          <Button variant="quiet" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="submit" busy={busy}>
            {submitLabel}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
