/* Cantidades de insumos — F2-10c (NUEVO): helpers compartidos entre
 * MaintenancePage.jsx y sus modales (F2-10c). Misma lógica EXACTA que
 * tenía MaintenancePage (legado/F2-10a), movida aquí sin cambiar
 * comportamiento. InterventionMaterials.jsx (Dev 2) conserva SU copia
 * privada de formatQuantity (que NO la toca el refactor). Insumo: coma
 * decimal es-PY, sin agrupar, hasta 3 decimales. formatQuantityUnit:
 * plural conservador de la unidad (solo si es UNA palabra, minúscula,
 * sin tildes y ≥4 letras: termina en vocal → +"s"; en l/r/n/d → +"es";
 * abreviaturas kg/m/lt/m2 quedan tal cual); singular solo con
 * Number(valor) === 1 (pluralizador del valor, no de la unidad). */
const UNIDAD_PLURAL = /^[a-z]{4,}$/;

function unidadPlural(unidad) {
  const texto = String(unidad ?? "");
  if (!UNIDAD_PLURAL.test(texto)) return texto;
  const ultima = texto.charAt(texto.length - 1);
  if ("aeiou".includes(ultima)) return `${texto}s`;
  if ("lrnd".includes(ultima)) return `${texto}es`;
  return texto;
}

export function formatQuantity(value) {
  return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 3, useGrouping: false }).format(Number(value));
}

export function formatQuantityUnit(value, unit) {
  const cantidad = Number(value);
  const unidad = cantidad === 1 ? unit : unidadPlural(unit);
  return `${formatQuantity(value)} ${unidad}`;
}
