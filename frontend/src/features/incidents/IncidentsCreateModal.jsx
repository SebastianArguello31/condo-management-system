/* Registro de incidencias con adjuntos mediante FormData.
 * Valida los campos y archivos antes del envío y presenta los errores dentro del modal. */
import { useEffect, useState } from "react";
import AttachmentRow from "./AttachmentRow";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation } from "../../hooks/useMutation";
import { validate, incidenciaCrear } from "../../validations";
import { Field, FormModal, Input, Select, Textarea, useToast, } from "../../components/ui";

/* Límites del backend (attachments.py). Si cambian allí,
 * este bloque es el único lugar del cliente que los repite. */
const LIMITE_ARCHIVOS = 3;
const LIMITE_BYTES = 5 * 1024 * 1024;
const LIMITE_VIDEO_BYTES = 25 * 1024 * 1024;
const EXTENSIONES_VIDEO = [".mp4", ".mov"];
const EXTENSIONES = [".jpg", ".jpeg", ".png", ".pdf", ...EXTENSIONES_VIDEO];
const ACCEPT = EXTENSIONES.join(",");

const EMPTY_FORM = {
  titulo: "",
  descripcion: "",
  id_unidad: "",
  id_tipo_incidencia: "",
};

const MENSAJE_413 =
  "Los archivos superan el tamaño permitido; reduce su peso o envía menos archivos.";

/* Límite de cantidad compartido con el backend. */
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
    const esVideo = EXTENSIONES_VIDEO.includes(extension);
    const limite = esVideo ? LIMITE_VIDEO_BYTES : LIMITE_BYTES;
    const limiteMB = limite / (1024 * 1024);
    if (!EXTENSIONES.includes(extension)) {
      errores.push(`${file.name} no es JPG, PNG, PDF, MP4 ni MOV.`);
    } else if (file.size <= 0) {
      errores.push(`${file.name} está vacío y no se puede adjuntar.`);
    } else if (file.size > limite) {
      errores.push(`${file.name} supera ${limiteMB} MB.`);
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
  const [seleccionError, setSeleccionError] = useState("");
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

  function agregarArchivos(event) {
    const seleccionados = Array.from(event.target.files ?? []);
    // Permite volver a seleccionar un archivo después de quitarlo.
    event.target.value = "";
    if (busy || seleccionados.length === 0) return;

    const combinados = [...archivos];
    for (const file of seleccionados) {
      const repetido = combinados.some((actual) =>
        actual.name === file.name &&
        actual.size === file.size &&
        actual.lastModified === file.lastModified
      );
      if (!repetido) combinados.push(file);
    }

    if (combinados.length > LIMITE_ARCHIVOS) {
      setSeleccionError(`${MENSAJE_MAX_ARCHIVOS} No se agregó esta selección; quita un archivo o selecciona menos.`);
      return;
    }
    setArchivos(combinados);
    setSeleccionError("");
  }

  function quitarArchivo(index) {
    if (busy) return;
    setArchivos((actuales) => actuales.filter((_, i) => i !== index));
    setSeleccionError("");
  }

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
    setSeleccionError("");
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
      } else if (err instanceof TypeError && !err.status) {
        setAccionError(
          "No se pudo confirmar el envío por un problema de conexión con el servidor. " +
          "Verifica tu conexión y que el servidor esté disponible. " +
          "Antes de reintentar, revisa el listado para evitar registrar la incidencia dos veces."
        );
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
          help={`Puedes agregar archivos en varias selecciones (${archivos.length}/${LIMITE_ARCHIVOS}). JPG, PNG o PDF: 5 MB por archivo. MP4 o MOV: 25 MB por video.`}
          error={[seleccionError, ...erroresAdjuntos].filter(Boolean).join(" ") || undefined}
        >
          <Input
            type="file"
            name="archivos"
            autoComplete="off"
            multiple
            accept={ACCEPT}
            disabled={busy}
            onChange={agregarArchivos}
          />
        </Field>
        {archivos.length > 0 && (
          <ul className="incident-attachments" aria-label="Archivos seleccionados">
            {archivos.map((file, index) => (
              <AttachmentRow
                key={JSON.stringify([file.name, file.size, file.lastModified])}
                name={file.name}
                detail={formatBytes(file.size)}
                removing
                disabled={busy}
                onAction={() => quitarArchivo(index)}
              />
            ))}
          </ul>
        )}
      </div>
    </FormModal>
  );
}
