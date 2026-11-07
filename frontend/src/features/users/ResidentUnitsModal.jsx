/* ResidentUnitsModal — F2-6b (NUEVO): "Ver unidades" del residente al kit
 * (B5). Reemplaza al legado ResidentUnits.jsx (retirado) y a su Modal con
 * <dialog open> sin backdrop/foco: UN solo h2 (el título del Modal, con el
 * nombre del residente una sola vez — sin descripción repetida y sin h2
 * internos; secciones con h3 propios). Mismos endpoints del legado: GET
 * /units + GET /users/:id/units en una consulta con signal, vincular POST
 * /users/:id/units {id_unidad} y desvincular DELETE /users/:id/units/:id.
 * - "Unidades vinculadas": lista con "Desvincular" (danger-ghost sm) y
 *   useConfirm danger (cero window.confirm); EmptyState breve sin unidades.
 * - "Vincular unidad": Select de disponibles (todas − vinculadas, mismas
 *   etiquetas "Edificio · código"); el botón SIEMPRE activo: sin unidad
 *   elegida → error de campo al enviar; sin disponibles → texto de ayuda.
 * - Error de la acción DENTRO del modal (Alert de la pantalla, incluido el
 *   400 "Debes activar al residente..." sobre un inactivo); éxito por
 *   Toast + reload de vinculadas (sin titilar) + onChanged (reload del
 *   listado del padre, sin titilar).
 * Reporte (sin tocar backend): el endpoint de vincular responde éxito
 * aunque ON CONFLICT DO NOTHING no inserte (resident_units.py); como el
 * Select omite las ya vinculadas, la UI no puede provocarlo.
 */
import { useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { useConfirm } from "../../hooks/useConfirm";
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Select,
  Skeleton,
  useToast,
} from "../../components/ui";

/* Titulares de sección (h3): el <h2> es SOLO el del Modal (patrón F2-5c). */
const TITULO_SECCION = {
  margin: "var(--space-6) 0 var(--space-3)",
  fontSize: "var(--fs-16)",
  lineHeight: "var(--lh-16)",
  color: "var(--ink)",
  fontWeight: 600,
};

const nombreCompleto = (registro) =>
  [registro?.nombre, registro?.apellido].filter(Boolean).join(" ") || "—";

const etiquetaUnidad = (unidad) =>
  [unidad?.edificio, unidad?.codigo].filter(Boolean).join(" · ");

export default function ResidentUnitsModal({ user, onClose, onChanged }) {
  const notify = useToast();
  const confirm = useConfirm();
  const [elegida, setElegida] = useState("");
  const [errorCampo, setErrorCampo] = useState(null);
  const [accionError, setAccionError] = useState("");

  const { data, loading, error, reload } = useQuery(async (signal) => {
    const [unidades, vinculadas] = await Promise.all([
      api(routes.units, { signal }),
      api(`${routes.users}/${user.id_usuario}/units`, { signal }),
    ]);
    return [unidades ?? [], vinculadas ?? []];
  }, [user.id_usuario]);

  const [unidades = [], vinculadas = []] = data ?? [];
  const disponibles = unidades.filter(
    (unidad) => !vinculadas.some((item) => item.id_unidad === unidad.id_unidad)
  );

  const vinculando = useMutation((id_unidad) =>
    api(`${routes.users}/${user.id_usuario}/units`, {
      method: "POST",
      body: { id_unidad },
    })
  );

  const desvinculando = useMutation((id_unidad) =>
    api(`${routes.users}/${user.id_usuario}/units/${id_unidad}`, {
      method: "DELETE",
    })
  );

  async function vincular() {
    if (vinculando.busy) return;
    setAccionError("");
    if (!elegida) {
      setErrorCampo({ id_unidad: "Este campo es requerido." });
      return;
    }
    setErrorCampo(null);
    try {
      await vinculando.run(Number(elegida));
      setElegida("");
      notify("Unidad vinculada.");
      await reload();
      await onChanged?.();
    } catch (err) {
      /* Incluye el 400 "Debes activar al residente antes de vincularlo"
       * sobre un residente inactivo: mensaje claro DENTRO del modal. */
      setAccionError(err?.message ?? "No se pudo vincular la unidad.");
    }
  }

  async function pedirDesvincular(unidad) {
    if (desvinculando.busy) return;
    const si = await confirm({
      title: "Desvincular unidad",
      message: `Se desvinculará la unidad ${etiquetaUnidad(unidad)} de ${nombreCompleto(user)}.`,
      confirmLabel: "Desvincular",
      danger: true,
    });
    if (!si) return;
    try {
      await desvinculando.run(unidad.id_unidad);
      notify("Unidad desvinculada.");
      await reload();
      await onChanged?.();
    } catch (err) {
      setAccionError(err?.message ?? "No se pudo desvincular la unidad.");
    }
  }

  return (
    <Modal
      title={`Unidades de ${nombreCompleto(user)}`}
      /* El nombre va SOLO en el título: sin description que lo repita
       * (requisito B5: un h2, sin nombre duplicado). */
      onClose={onClose}
      backdrop
      footer={
        <Button variant="quiet" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {loading && !data && <Skeleton lines={5} />}

      {!loading && error && !data && (
        <ErrorState
          title="No se pudieron cargar las unidades"
          description={error.message}
          onRetry={reload}
        />
      )}

      {data && (
        <>
          {accionError && (
            <Alert
              tone="danger"
              title="No se pudo completar la acción"
              onDismiss={() => setAccionError("")}
            >
              {accionError}
            </Alert>
          )}

          <h3 style={{ ...TITULO_SECCION, margin: "0 0 var(--space-3)" }}>
            Unidades vinculadas
          </h3>
          {vinculadas.length === 0 ? (
            <EmptyState
              title="El residente todavía no tiene unidades vinculadas."
              description="Vincula una unidad en la sección de abajo."
            />
          ) : (
            <ul
              style={{
                margin: 0,
                paddingLeft: 0,
                listStyle: "none",
                display: "grid",
                gap: "var(--space-2)",
              }}
            >
              {vinculadas.map((unidad) => (
                <li
                  key={unidad.id_unidad}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--space-3)",
                    paddingBlock: "var(--space-2)",
                  }}
                >
                  <span>{etiquetaUnidad(unidad)}</span>
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    disabled={desvinculando.busy}
                    aria-label={`Desvincular la unidad ${etiquetaUnidad(unidad)} de ${nombreCompleto(user)}`}
                    onClick={() => pedirDesvincular(unidad)}
                  >
                    Desvincular
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <h3 style={TITULO_SECCION}>Vincular unidad</h3>
          <div className="ui-form-stack">
            <Field
              label="Unidad"
              required
              error={errorCampo?.id_unidad}
              help={
                disponibles.length === 0
                  ? "No hay unidades disponibles para vincular al residente."
                  : undefined
              }
            >
              <Select
                name="id_unidad"
                autoComplete="off"
                value={elegida}
                onChange={(event) => {
                  setElegida(event.target.value);
                  setErrorCampo(null);
                }}
              >
                <option value="">Seleccionar...</option>
                {disponibles.map((unidad) => (
                  <option key={unidad.id_unidad} value={unidad.id_unidad}>
                    {etiquetaUnidad(unidad)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="ui-form-actions">
            {/* Siempre activo: enviar sin unidad muestra el error de campo
             * en lugar de dejarse deshabilitado. */}
            <Button busy={vinculando.busy} onClick={vincular}>
              Vincular
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
