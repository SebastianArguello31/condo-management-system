/* ConfirmDialog: el componente que se monta UNA vez dentro de
 * <ConfirmProvider> y enchufa useConfirm/useConfirmResponder. Cada llamada
 * confirm({title, message, danger, confirmLabel}) resuelve true/confirma o
 * false/cancelar, con Esc devolviendo false. Sin <ConfirmProvider> arriba,
 * no renderiza nada (el hook ya resuelve false). Requiere CP4: se monta
 * junto al Shell en la migración.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirmResponder } from "../../hooks/useConfirm";
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog() {
  const register = useConfirmResponder();
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  const responder = useCallback(
    (requestOptions) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setOptions(requestOptions ?? {});
      }),
    []
  );

  useEffect(() => {
    if (!register) return undefined;
    return register(responder);
  }, [register, responder]);

  const responderCon = (value) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  };

  if (!options) return null;

  return (
    <Modal
      title={options.title}
      description={options.description}
      onClose={() => responderCon(false)}
      backdrop
      footer={
        <>
          <Button variant="quiet" onClick={() => responderCon(false)} autoFocus={options.danger}>
            Cancelar
          </Button>
          <Button
            variant={options.danger ? "danger" : "primary"}
            onClick={() => responderCon(true)}
            autoFocus={!options.danger}
          >
            {options.confirmLabel ?? "Confirmar"}
          </Button>
        </>
      }
    >
      <p className="ui-confirm-message">{options.message}</p>
    </Modal>
  );
}
