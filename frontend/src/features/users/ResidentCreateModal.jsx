/* ResidentCreateModal — F2-6b (NUEVO): creación de residentes al kit.
 * Retira el uso de CreateAccount en Residentes (el componente queda sin
 * consumidores y se elimina; los bugs B2 y B3 cierran POR DISEÑO: los
 * inputs llevan name + autoComplete y el error vive DENTRO del modal).
 * Paridad con el creador legado: mismos campos (nombre, apellido, email,
 * teléfono, contraseña y "Unidad inicial" como Select de GET /units con
 * etiqueta "Edificio · código"), mismo endpoint POST /residents y mismo
 * payload (strings con trim, password SIN trim, id_unidad Number). Cambios
 * por convención (§8-bis): FormModal con el error de la acción DENTRO
 * (Alert danger con foco/scroll; 400/409 con err.errors por campo
 * normalizado), éxito por Toast + reload() del padre sin titilar,
 * validación en cliente con validate() + cuentaResidente y nota de
 * campos obligatorios activada. El error por campo va DIRECTO a cada
 * Field (los Field son JSX inline, FUERA del FormErrorsContext — lección
 * F2-5b; NO useFormFieldError aquí). Español neutro (el "Primero
 * registrá..." del legado pasa a "Primero registra...").
 */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation } from "../../hooks/useMutation";
import { useQuery } from "../../hooks/useQuery";
import { validate, cuentaResidente } from "../../validations";
import {
  ErrorState,
  Field,
  FormModal,
  Input,
  Select,
  useToast,
} from "../../components/ui";

const EMPTY_FORM = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  password: "",
  id_unidad: "",
};

/* err.errors del backend trae ARRAYS por campo → string por campo. */
function normalizarErrores(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensajes]) => [
      campo,
      Array.isArray(mensajes) ? (mensajes[0] ?? "") : String(mensajes),
    ])
  );
}

export default function ResidentCreateModal({ onClose, onCreated }) {
  const notify = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [camposErr, setCamposErr] = useState(null);
  const [accionError, setAccionError] = useState("");
  /* Se incrementa en cada submit: al fallar, mueve el foco al PRIMER
   * control inválido del modal (Field reparte aria-invalid). */
  const [intento, setIntento] = useState(0);

  /* Catálogo de unidades para la "Unidad inicial" (GET /units, el mismo
   * del creador legado). El modal se monta SOLO al abrir, así el fetch no
   * se dispara al cargar la pantalla. */
  const {
    data: unidadesData,
    loading: cargandoUnidades,
    error: errorUnidades,
    reload: recargarUnidades,
  } = useQuery((signal) => api(routes.units, { signal }), []);
  const unidades = unidadesData ?? [];

  const guardando = useMutation((body) =>
    api(routes.residents, { method: "POST", body })
  );
  const busy = guardando.busy;

  /* El error por campo se LIMPIA al editar ese campo (al reabrir todo se
   * reinicia por el desmontaje). */
  const update = (event) => {
    const { name } = event.target;
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setCamposErr((current) => {
      if (!current || !(name in current)) return current;
      const { [name]: omitido, ...resto } = current;
      return resto;
    });
  };

  useEffect(() => {
    if (intento === 0) return;
    document.querySelector(".ui-modal-body .ui-control-invalid")?.focus();
  }, [intento]);

  function reiniciar() {
    setForm({ ...EMPTY_FORM });
    setCamposErr(null);
    setAccionError("");
  }

  function manejarCerrar() {
    if (busy) return; // cierre bloqueado mientras envía (FormModal)
    reiniciar();
    onClose();
  }

  async function guardar() {
    if (busy) return;
    setAccionError("");

    /* Validación del esquema espejo ResidentCreateSchema (password excluida
     * del trim, igual que el pre_load del backend). */
    const erroresCampos = validate(form, cuentaResidente);
    setCamposErr(Object.keys(erroresCampos).length > 0 ? erroresCampos : null);
    setIntento((current) => current + 1);
    if (Object.keys(erroresCampos).length > 0) return;

    /* Payload IDÉNTICO al creador legado: strings con trim, password sin
     * tocar e id_unidad Number. */
    const body = Object.fromEntries(
      ["nombre", "apellido", "email", "telefono"].map((key) => [
        key,
        form[key].trim(),
      ])
    );
    body.password = form.password;
    body.id_unidad = Number(form.id_unidad);

    try {
      await guardando.run(body);
      reiniciar();
      onClose();
      notify("Residente creado.");
      await onCreated?.();
    } catch (err) {
      /* 400 marshmallow y 409 de vínculo duplicado: el texto del backend en
       * la Alert DENTRO del modal + errores por campo si trae err.errors. */
      setAccionError(err?.message ?? "No se pudo crear el residente.");
      if (err?.errors) setCamposErr(normalizarErrores(err.errors));
      setIntento((current) => current + 1);
    }
  }

  return (
    <FormModal
      title="Nuevo residente"
      open
      busy={busy}
      error={accionError || undefined}
      fieldErrors={camposErr}
      showRequiredNote
      onSubmit={guardar}
      onClose={manejarCerrar}
    >
      {errorUnidades && !unidadesData ? (
        <ErrorState
          title="No se pudieron cargar las unidades"
          description={errorUnidades.message}
          onRetry={recargarUnidades}
        />
      ) : (
        <div className="ui-form-stack">
          <Field label="Nombre" required error={camposErr?.nombre}>
            <Input
              name="nombre"
              autoComplete="off"
              value={form.nombre}
              onChange={update}
              disabled={busy || cargandoUnidades}
            />
          </Field>
          <Field label="Apellido" required error={camposErr?.apellido}>
            <Input
              name="apellido"
              autoComplete="off"
              value={form.apellido}
              onChange={update}
              disabled={busy || cargandoUnidades}
            />
          </Field>
          <Field label="Email" required error={camposErr?.email}>
            <Input
              type="email"
              name="email"
              autoComplete="off"
              value={form.email}
              onChange={update}
              disabled={busy || cargandoUnidades}
            />
          </Field>
          <Field label="Teléfono" required error={camposErr?.telefono}>
            <Input
              name="telefono"
              autoComplete="off"
              value={form.telefono}
              onChange={update}
              disabled={busy || cargandoUnidades}
            />
          </Field>
          <Field label="Contraseña" required error={camposErr?.password}>
            <Input
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update}
              disabled={busy || cargandoUnidades}
            />
          </Field>
          <Field
            label="Unidad inicial"
            required
            error={camposErr?.id_unidad}
            help={
              unidadesData && unidades.length === 0
                ? "Aún no hay unidades registradas; primero registra una unidad."
                : undefined
            }
          >
            <Select
              name="id_unidad"
              autoComplete="off"
              value={form.id_unidad}
              onChange={update}
              disabled={busy || cargandoUnidades}
            >
              <option value="">Seleccionar...</option>
              {unidades.map((unidad) => (
                <option key={unidad.id_unidad} value={unidad.id_unidad}>
                  {unidad.edificio} · {unidad.codigo}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </FormModal>
  );
}
