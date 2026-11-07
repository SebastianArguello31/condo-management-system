/* MovimientoFormModal — F2-10c (NUEVO): "Registrar movimiento" al kit
 * (FormModal), reemplaza el modal legado de MaintenancePage. Paridad de
 * campos: Tipo (Select con SOLO Entrada/Salida — constante de MÓDULO;
 * los tipos INICIAL/AJUSTE_ENTRADA, AJUSTE_SALIDA Y DEVOLUCIÓN siguen fuera del UI por la
 * reducción de Dev 2, el legado tampoco los ofrecía) con ENTRADA por
 * defecto, Cantidad y Motivo (textarea). Arriba, en SOLO LECTURA, la
 * "Existencia actual" de la FILA del listado con formatQuantityUnit (sin
 * GET extra), para evitar salidas que dejarían stock negativo; ese caso
 * NO se calcula en cliente: POST /maintenance/insumos/:id/entradas o
 * /salidas con el payload IDÉNTICO al del legado ({ cantidad del input,
 * motivo trim }) y el backend responde 400 con TEXTO EXACTO
 * ("El movimiento dejaría el stock en negativo" /
 * "No se pueden registrar movimientos para un insumo inactivo" —
 * backend/app/modules/maintenance/services/inventory.py) que se muestra
 * DENTRO del modal (Alert danger del FormModal con foco/scroll).
 * Validación en cliente PRIMERO: schema `movimientoCrear` (espejo EXACTO
 * de MovimientoSchema: cantidad requerida MAYOR que 0, máx. 3 decimales;
 * motivo requerido 3–500) y luego err.errors del backend (arrays →
 * string) → error DIRECTO al Field (lección F2-5b) + foco al PRIMER
 * .ui-control-invalid por contador `intento` (el error por campo se
 * limpia al editar ese campo). Números: type="number"
 * inputMode="decimal" min="0" step="any" — flechas de 1 en 1 (el
 * step="any" provisional de F2-10a queda definitivo al retirarse el
 * modal legado), decimales aceptados y precisión validada por el espejo
 * Y el backend. Convenciones §8-bis/§8-ter: pila .ui-form-stack total
 * control vía Field con name y autoComplete="off", cierre bloqueado
 * mientras busy, useMutation (doble clic = UN envío), botón SIEMPRE
 * activo salvo busy, cero window.confirm. Éxito: modal cierra + Toast
 * "Movimiento registrado." (decisión F2-10c) + onGuardado() = reload()
 * del listado sin titilar. Español neutro (tuteo). Cero CSS nuevo.
 */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation } from "../../hooks/useMutation";
import { validate, movimientoCrear } from "../../validations";
import {
  Field,
  FormModal,
  Input,
  Select,
  Textarea,
  useToast,
} from "../../components/ui";
import { formatQuantityUnit } from "./quantity";

/* Select de tipo del UI (constante de módulo; el legado ofrecía los
 * mismos DOS tipos con ENTRADA por defecto). */
const MOVIMIENTO_TIPOS = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SALIDA", label: "Salida" },
];

/* Endpoint por tipo (paridad del MOVEMENT_PATHS del legado): POST
 * /maintenance/insumos/:id/entradas | /salidas, rol ADMIN. */
const MOVIMIENTO_RUTAS = {
  ENTRADA: "entradas",
  SALIDA: "salidas",
};

const EMPTY_FORM = { tipo: "ENTRADA", cantidad: "", motivo: "" };

/* err.errors del backend trae ARRAYS por campo → string por campo. */
function normalizarErrores(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensajes]) => [
      campo,
      Array.isArray(mensajes) ? (mensajes[0] ?? "") : String(mensajes),
    ])
  );
}

export default function MovimientoFormModal({ insumo, onClose, onGuardado }) {
  const notify = useToast();
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const [camposErr, setCamposErr] = useState(null);
  const [accionError, setAccionError] = useState("");
  /* Se incrementa en cada intento fallido: mueve el foco al PRIMER
   * control inválido del modal (los Field reparten aria-invalid). */
  const [intento, setIntento] = useState(0);

  const guardando = useMutation((body) =>
    api(
      `${routes.maintenance}/insumos/${insumo.id_insumo}/${MOVIMIENTO_RUTAS[form.tipo]}`,
      { method: "POST", body },
    )
  );
  const busy = guardando.busy;

  /* El error por campo se LIMPIA al editar ese campo (también cambia la
   * ruta del POST: se lee form.tipo DENTRO de la mutación). */
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

  /* Payload IDÉNTICO al del legado: `cantidad` conserva el valor del
   * input (el backend lo carga como Decimal igual que un número) y
   * `motivo` va trim. */
  function armarPayload() {
    return {
      cantidad: form.cantidad,
      motivo: form.motivo.trim(),
    };
  }

  async function guardar() {
    if (busy) return;
    setAccionError("");

    /* Primero la validación en cliente (espejo del MovimientoSchema);
     * después el mapeo del 400 real. */
    const erroresCampos = validate(form, movimientoCrear);
    setCamposErr(Object.keys(erroresCampos).length > 0 ? erroresCampos : null);
    setIntento((current) => current + 1);
    if (Object.keys(erroresCampos).length > 0) return;

    try {
      await guardando.run(armarPayload());
      onClose();
      notify("Movimiento registrado.");
      await onGuardado?.();
    } catch (err) {
      /* 400 marshmallow por campo u otro error de la acción (stock
       * negativo / insumo inactivo), SIEMPRE DENTRO del modal. */
      setAccionError(err?.message ?? "No se pudo registrar el movimiento.");
      if (err?.errors) setCamposErr(normalizarErrores(err.errors));
      setIntento((current) => current + 1);
    }
  }

  return (
    <FormModal
      title={`Registrar movimiento · ${insumo.nombre}`}
      open
      busy={busy}
      error={accionError || undefined}
      showRequiredNote
      submitLabel="Registrar movimiento"
      onSubmit={guardar}
      onClose={onClose}
    >
      {/* Existencia actual de la FILA (solo lectura; sin GET extra): la
       * referencia visual para no registrar salidas imposibles; aun así
       * el 400 real llega a la Alert DENTRO del modal. */}
      <p style={{ margin: "0 0 var(--space-3)", color: "var(--ink-2)" }}>
        Existencia actual: {formatQuantityUnit(insumo.stock, insumo.unidad_medida)}
      </p>
      <div className="ui-form-stack">
        <Field label="Tipo de movimiento" required error={camposErr?.tipo}>
          <Select
            name="tipo"
            required
            autoComplete="off"
            value={form.tipo}
            onChange={actualizar("tipo")}
            disabled={busy}
          >
            {MOVIMIENTO_TIPOS.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cantidad" required error={camposErr?.cantidad}>
          <Input
            type="number"
            name="cantidad"
            autoComplete="off"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.cantidad}
            onChange={actualizar("cantidad")}
            disabled={busy}
          />
        </Field>
        <Field label="Motivo" required error={camposErr?.motivo}>
          <Textarea
            name="motivo"
            autoComplete="off"
            maxLength={500}
            rows={3}
            value={form.motivo}
            onChange={actualizar("motivo")}
            disabled={busy}
          />
        </Field>
      </div>
    </FormModal>
  );
}
