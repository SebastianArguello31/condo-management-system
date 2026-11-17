/* Formato de cantidades con hasta tres decimales y pluralización conservadora.
 * Las abreviaturas de unidades se conservan sin cambios. */
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
