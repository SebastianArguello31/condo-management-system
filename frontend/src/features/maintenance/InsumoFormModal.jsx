/* Creación y edición de insumos con validación de cantidades y costos.
 * Al editar, conserva la categoría asignada aunque esté inactiva. */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation } from "../../hooks/useMutation";
import { validate, insumoCrear, insumoEditar } from "../../validations";
import { Field, FormModal, Input, Select, Textarea, useToast, } from "../../components/ui";

const EMPTY_FORM = {
  nombre: "",
  descripcion: "",
  categoria: "",
  unidad_medida: "",
  stock_minimo: "0",
  costo_unitario: "0",
};

/* "1.000" → "1"; "1500.00" → "1500"; ""/null → "" (el backend trae los
 * decimales como string por as_string=True). Sin NaN: si no parsea queda
 * tal cual. */
function valorInicialNumero(value) {
  if (value === undefined || value === null || value === "") return "";
  const numero = Number(value);
  return Number.isNaN(numero) ? String(value) : String(numero);
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

export default function InsumoFormModal({ insumo, categorias = [], cargandoCategorias, onClose, onGuardado }) {
  const esEdicion = Boolean(insumo);
  const notify = useToast();
  const [form, setForm] = useState(() =>
    esEdicion
      ? {
          nombre: insumo.nombre ?? "",
          descripcion: insumo.descripcion ?? "",
          categoria: insumo.categoria ?? "",
          unidad_medida: insumo.unidad_medida ?? "",
          stock_minimo: valorInicialNumero(insumo.stock_minimo ?? "0"),
          costo_unitario: valorInicialNumero(insumo.costo_unitario ?? "0"),
        }
      : { ...EMPTY_FORM }
  );
  const [camposErr, setCamposErr] = useState(null);
  const [accionError, setAccionError] = useState("");
  /* Se incrementa en cada intento fallido: mueve el foco al PRIMER
   * control inválido del modal (los Field reparten aria-invalid). */
  const [intento, setIntento] = useState(0);

  const guardando = useMutation((body) =>
    esEdicion
      ? api(`${routes.maintenance}/insumos/${insumo.id_insumo}`, {
          method: "PATCH",
          body,
        })
      : api(`${routes.maintenance}/insumos`, { method: "POST", body })
  );
  const busy = guardando.busy;
  const nombresActivos = categorias
    .filter((categoria) => categoria.activo)
    .map((categoria) => categoria.nombre)
    .sort();
  const categoriaActualInactiva = Boolean(
    esEdicion && insumo.categoria && !nombresActivos.includes(insumo.categoria)
  );

  /* El error por campo se LIMPIA al editar ese campo. */
  const actualizar = (campo) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [campo]: value }));
    setCamposErr((current) => {
      if (!current || !(campo in current)) return current;
      const { [campo]: omitido, ...resto } = current;
      return resto;
    });
  };

  useEffect(() => {
    if (intento === 0) return;
    document.querySelector(".ui-modal-body .ui-control-invalid")?.focus();
  }, [intento]);

  /* Payload IDÉNTICO al legado (mismos 6 campos, siempre los dos
   * numéricos), con los números como NÚMERO válido: costo vacío → 0
   * (el load_default del backend): "" llegaría como error de Decimal. */
  function armarPayload() {
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria: form.categoria.trim(),
      unidad_medida: form.unidad_medida.trim(),
      stock_minimo: form.stock_minimo === "" ? 0 : Number(form.stock_minimo),
      costo_unitario: form.costo_unitario === "" ? 0 : Number(form.costo_unitario),
    };
    const categoria = categorias.find((item) => item.nombre === form.categoria);
    if (esEdicion && form.categoria === insumo.categoria && categoria?.activo === false) {
      delete payload.categoria;
    }
    return payload;
  }

  async function guardar() {
    if (busy) return;
    setAccionError("");

    /* Primero la validación en cliente (espejo EXACTO del schema del
     * backend según el modo), después el mapeo del 400 real. */
    const erroresCampos = validate(form, esEdicion ? insumoEditar : insumoCrear);
    setCamposErr(Object.keys(erroresCampos).length > 0 ? erroresCampos : null);
    setIntento((current) => current + 1);
    if (Object.keys(erroresCampos).length > 0) return;

    try {
      await guardando.run(armarPayload());
      onClose();
      notify(esEdicion ? "Insumo actualizado." : "Insumo creado.");
      await onGuardado?.();
    } catch (err) {
      /* 400 marshmallow por campo u otro error de la acción, siempre
       * DENTRO del modal (Alert danger del FormModal con foco/scroll). */
      setAccionError(err?.message ?? "No se pudo guardar el insumo.");
      if (err?.errors) setCamposErr(normalizarErrores(err.errors));
      setIntento((current) => current + 1);
    }
  }

  return (
    <FormModal
      title={esEdicion ? "Editar insumo" : "Nuevo insumo"}
      description={esEdicion ? `Insumo: ${insumo.nombre}` : undefined}
      open
      busy={busy}
      error={accionError || undefined}
      showRequiredNote
      submitLabel="Guardar"
      onSubmit={guardar}
      onClose={onClose}
    >
      <div className="ui-form-stack">
        <Field label="Nombre" required error={camposErr?.nombre}>
          <Input
            name="nombre"
            autoComplete="off"
            maxLength={150}
            value={form.nombre}
            onChange={actualizar("nombre")}
            disabled={busy}
          />
        </Field>
        <Field
          label="Categoría"
          required
          error={camposErr?.categoria}
          help={categoriaActualInactiva
            ? "La categoría actual está inactiva. Elige una activa para cambiarla."
            : undefined}
        >
          <Select
            name="categoria"
            disabled={busy || cargandoCategorias}
            value={form.categoria}
            onChange={actualizar("categoria")}
          >
            <option value="">{cargandoCategorias ? "Cargando categorías..." : "Seleccionar..."}</option>
            {categoriaActualInactiva && (
              <option value={insumo.categoria}>{insumo.categoria} (inactiva)</option>
            )}
            {nombresActivos.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </Select>
        </Field>
        <Field label="Unidad de medida" required error={camposErr?.unidad_medida}>
          <Input
            name="unidad_medida"
            autoComplete="off"
            maxLength={40}
            value={form.unidad_medida}
            onChange={actualizar("unidad_medida")}
            disabled={busy}
          />
        </Field>
        <Field label="Stock mínimo" required error={camposErr?.stock_minimo}>
          <Input
            type="number"
            name="stock_minimo"
            autoComplete="off"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.stock_minimo}
            onChange={actualizar("stock_minimo")}
            disabled={busy}
          />
        </Field>
        <Field
          label="Costo unitario"
          error={camposErr?.costo_unitario}
          help="Opcional. Si lo dejas vacío, se registra 0."
        >
          <Input
            type="number"
            name="costo_unitario"
            autoComplete="off"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.costo_unitario}
            onChange={actualizar("costo_unitario")}
            disabled={busy}
          />
        </Field>
        <Field
          label="Descripción"
          error={camposErr?.descripcion}
          help="Opcional, hasta 2000 caracteres."
        >
          <Textarea
            name="descripcion"
            autoComplete="off"
            maxLength={2000}
            rows={3}
            value={form.descripcion}
            onChange={actualizar("descripcion")}
            disabled={busy}
          />
        </Field>
      </div>
    </FormModal>
  );
}
