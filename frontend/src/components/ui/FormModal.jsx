/* FormModal (convenciones §2.18 y §2.20 del plan): Modal + <form> que fija
 * el patrón de los formularios en modal:
 * - El error de la acción se muestra DENTRO del modal: Alert tone danger
 *   (role="alert") al inicio del cuerpo, con foco y scroll al aparecer.
 * - El éxito lo informa el PADRE con Toast (aquí no hay Toast).
 * - Errores por campo: fieldErrors = { campo: mensaje }; los hijos los
 *   consultan con useFormFieldError(nombre) y los pintan en su Field.
 * - Cierre bloqueado mientras busy (×, Esc y Cancelar deshabilitados —
 *   Modal ya atrapa onCancel cuando busy).
 * - Footer estándar Cancelar/Guardar con spinner en el submit.
 * API: <FormModal title description open busy error fieldErrors submitLabel
 * cancelLabel onSubmit onClose>children</FormModal>.
 */
import { createContext, useContext, useEffect, useRef } from "react";
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
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  onSubmit,
  onClose,
  children,
}) {
  const alertRef = useRef(null);

  useEffect(() => {
    if (open && error) {
      alertRef.current?.focus({ preventScroll: false });
      alertRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [open, error]);

  if (!open) return null;

  return (
    <Modal title={title} description={description} busy={busy} onClose={onClose} backdrop>
      <form
        noValidate
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
