/* IncidentsCreateModal — F2-5b: modal de creación de incidencias al kit
 * (cierra B8). Paridad con el creador legado de IncidentsPage: misma
 * FormData ("titulo", "descripcion", "id_unidad", "id_tipo_incidencia" y
 * cada archivo bajo "archivos"), mismo endpoint (POST /incidents). Cambios
 * por convención (§8-bis): FormModal con el error de la acción DENTRO
 * (Alert danger con foco/scroll; HTTP 413 y 400 con err.errors por
 * campo), éxito por Toast y reload() del padre sin titilar, validación en
 * cliente con validate()+incidenciaCrear, cierre bloqueado en busy, Field
 * con name/autoComplete, nota de campos obligatorios activada y límites
 * de adjuntos verificados en cliente contra los REALES del backend
 * (backend/app/modules/incidents/attachments.py:8-15 — 3 archivos, 5 MB,
 * .jpg/.jpeg/.png/.pdf).
 */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation } from "../../hooks/useMutation";
import { validate, incidenciaCrear } from "../../validations";
import {
  Field,
  FormModal,
  Input,
  Select,
  Textarea,
  useToast,
} from "../../components/ui";

/* Límites REALES del backend (attachments.py:8-15). Si cambian allí,
 * este bloque es el único lugar del cliente que los repite. */
const LIMITE_ARCHIVOS = 3;
const LIMITE_BYTES = 5 * 1024 * 1024;
const EXTENSIONES = [".jpg", ".jpeg", ".png", ".pdf"];
const ACCEPT = ".jpg,.jpeg,.png,.pdf";

const EMPTY_FORM = {
  titulo: "",
  descripcion: "",
  id_unidad: "",
  id_tipo_incidencia: "",
};

const MENSAJE_413 =
  "Los archivos superan el tamaño permitido; reduce su peso o envía menos archivos.";

/* Mismo mensaje textual del backend (attachments.py:25). */
const MENSAJE_MAX_ARCHIVOS = `Puedes adjuntar como máximo ${LIMITE_ARCHIVOS} archivos.`;

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/* Verificación en cliente de los límites del backend, mensaje por archivo. */
function validarArchivos(lista) {
  const errores = [];
  if (lista.length > LIMITE_ARCHIVOS) errores.push(MENSAJE_MAX_ARCHIVOS);
  for (const file of lista) {
    const punto = file.name.lastIndexOf(".");
    const extension = punto >= 0 ? file.name.slice(punto).toLowerCase() : "";
    if (!EXTENSIONES.includes(extension)) {
      errores.push(`${file.name} no es JPG, PNG ni PDF.`);
    } else if (file.size <= 0) {
      errores.push(`${file.name} está vacío y no se puede adjuntar.`);
    } else if (file.size > LIMITE_BYTES) {
      errores.push(`${file.name} supera 5 MB.`);
    }
  }
  return errores;
}

/* err.errors del backend trae ARRAYS por campo → string por campo. */
function normalizarErrores(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensajes]) => [
      campo,
      Array.isArray(mensajes) ? (mensajes[0] ?? "") : String(mensajes),
    ])
  );
}

export default function IncidentsCreateModal({
  open,
  onClose,
  onCreated,
  unidades = [],
  tipos = [],
}) {
  const notify = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [archivos, setArchivos] = useState([]);
  const [camposErr, setCamposErr] = useState(null);
  const [accionError, setAccionError] = useState("");
  /* Se incrementa en cada submit: al fallar la validación/adjuntos, el
   * efecto mueve el foco al PRIMER control inválido del modal. */
  const [intento, setIntento] = useState(0);

  const guardando = useMutation((body) =>
    api(routes.incidents, { method: "POST", body })
  );
  const busy = guardando.busy;

  const erroresAdjuntos = validarArchivos(archivos);

  /* El error por campo se LIMPIA al editar ese campo (o al reabrir, via
   * reiniciar()). */
  const update = (event) => {
    const { name } = event.target;
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setCamposErr((current) => {
      if (!current || !(name in current)) return current;
      const { [name]: omitido, ...resto } = current;
      return resto;
    });
  };

  /* Foco al primer campo con error tras un envío inválido (campos,
   * adjuntos o errores del servidor): el PRIMER control con aria-invalid
   * dentro del cuerpo del modal (Field reparte aria-invalid a su control).
   * `intento` cambia SOLO en cada submit para no robar el foco al
   * editar; los errores y `intento` van en el mismo batch, así el
   * efecto ve el DOM ya actualizado. */
  useEffect(() => {
    if (intento === 0) return;
    document.querySelector(".ui-modal-body .ui-control-invalid")?.focus();
  }, [intento]);

  function reiniciar() {
    setForm({ ...EMPTY_FORM });
    setArchivos([]);
    setCamposErr(null);
    setAccionError("");
  }

  function manejarCerrar() {
    if (busy) return; // el cierre queda bloqueado mientras envía (FormModal)
    reiniciar();
    onClose();
  }

  async function guardar() {
    if (busy) return;
    setAccionError("");

    /* Validación de TODO a la vez: campos (validate + incidenciaCrear) y
     * adjuntos. Sin return anticipado que oculte un tipo de error: los
     * errores de campo se pintan en cada Field y los de adjuntos en el
     * de Evidencias; se envía solo si no hay ninguno. */
    const erroresCampos = validate(form, incidenciaCrear);
    setCamposErr(Object.keys(erroresCampos).length > 0 ? erroresCampos : null);
    setIntento((current) => current + 1);
    if (Object.keys(erroresCampos).length > 0 || erroresAdjuntos.length > 0) return;

    /* FormData IDÉNTICO al creador legado (mismos nombres de campo). */
    const body = new FormData();
    ["titulo", "descripcion", "id_unidad", "id_tipo_incidencia"].forEach((key) =>
      body.append(key, form[key])
    );
    archivos.forEach((file) => body.append("archivos", file));

    try {
      await guardando.run(body);
      reiniciar();
      onClose();
      notify("Incidencia registrada.");
      await onCreated?.();
    } catch (err) {
      if (err?.status === 413) {
        setAccionError(MENSAJE_413);
      } else {
        setAccionError(err?.message ?? "No se pudo registrar la incidencia.");
        if (err?.errors) setCamposErr(normalizarErrores(err.errors));
      }
      setIntento((current) => current + 1); // foco al primer campo con error
    }
  }

  return (
    <FormModal
      title="Nueva incidencia"
      open={open}
      busy={busy}
      error={accionError || undefined}
      fieldErrors={camposErr}
      showRequiredNote
      submitLabel="Guardar"
      onSubmit={guardar}
      onClose={manejarCerrar}
    >
      <div className="ui-form-stack">
        {/* Los errores por campo van DIRECTOS al Field (error=camposErr?.campo,
         * mismo resultado que useFormFieldError DENTRO de FormModal - el hook
         * debe llamarse en un HIJO del FormModal y aquí los Field son JSX
         * inline de este componente, FUERA del FormErrorsContext). */}
        <Field label="Título" required error={camposErr?.titulo}>
          <Input
            name="titulo"
            autoComplete="off"
            value={form.titulo}
            onChange={update}
          />
        </Field>
        <Field label="Descripción" required error={camposErr?.descripcion}>
          <Textarea
            name="descripcion"
            autoComplete="off"
            rows={3}
            value={form.descripcion}
            onChange={update}
          />
        </Field>
        <Field label="Unidad" required error={camposErr?.id_unidad}>
          <Select
            name="id_unidad"
            autoComplete="off"
            value={form.id_unidad}
            onChange={update}
          >
            <option value="">Seleccionar...</option>
            {unidades.map((unidad) => (
              <option key={unidad.id_unidad} value={unidad.id_unidad}>
                {unidad.edificio} · {unidad.codigo}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo" required error={camposErr?.id_tipo_incidencia}>
          <Select
            name="id_tipo_incidencia"
            autoComplete="off"
            value={form.id_tipo_incidencia}
            onChange={update}
          >
            <option value="">Seleccionar...</option>
            {tipos.map((tipo) => (
              <option key={tipo.id_tipo_incidencia} value={tipo.id_tipo_incidencia}>
                {tipo.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <p>Se registra con prioridad Normal.</p>
        <Field
          label="Evidencias"
          help={`Hasta ${LIMITE_ARCHIVOS} archivos, 5 MB cada uno. JPG, PNG o PDF.`}
          error={erroresAdjuntos.length > 0 ? erroresAdjuntos.join(" ") : undefined}
        >
          <Input
            type="file"
            name="archivos"
            autoComplete="off"
            multiple
            accept={ACCEPT}
            onChange={(event) => setArchivos([...event.target.files])}
          />
        </Field>
        {archivos.length > 0 && (
          <ul>
            {archivos.map((file) => (
              <li key={file.name}>
                {file.name} · {formatBytes(file.size)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormModal>
  );
}
