/* ==========================================================================
 * Formato de fechas y horas en hora LOCAL del navegador (pendiente F2-3:
 * adoptar en Mis reservas; luego en F2-4 y F2-5).
 * Entradas aceptadas: string ISO del backend ("AAAA-MM-DD" o
 * "AAAA-MM-DD[THH:MM[:SS]]") o Date. No se mezclan unidades ni zonas:
 * un string solo de fecha se construye en hora local para NO desplazar el
 * día (new Date("AAAA-MM-DD") lo lee como UTC y en zonas negativas muestra
 * el día anterior); un string con hora se pasa a new Date() tal cual, que
 * la interpreta en la zona del navegador cuando no trae offset.
 * Toda función devuelve "" ante null/undefined/cadena vacía/inválida.
 * ========================================================================== */

const pad2 = (numero) => String(numero).padStart(2, "0");

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw === "") return null;
  const soloFecha = SOLO_FECHA.exec(raw);
  if (soloFecha) {
    return new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]));
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* DD/MM/AAAA en hora local. Ejemplos:
 * formatDate("2026-03-05")            → "05/03/2026"
 * formatDate("2026-03-05T14:30:00")   → "05/03/2026"
 */
export function formatDate(value) {
  const fecha = parseLocalDate(value);
  if (!fecha) return "";
  return `${pad2(fecha.getDate())}/${pad2(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/* HH:MM (24 h) en hora local. Ejemplos:
 * formatTime("2026-03-05T14:30:00")   → "14:30"
 * formatTime("2026-03-05")            → "00:00"
 */
export function formatTime(value) {
  const fecha = parseLocalDate(value);
  if (!fecha) return "";
  return `${pad2(fecha.getHours())}:${pad2(fecha.getMinutes())}`;
}

/* "DD/MM/AAAA HH:MM" en hora local. Ejemplos:
 * formatDateTime("2026-03-05T14:30:00") → "05/03/2026 14:30"
 * formatDateTime("2026-03-05")          → "05/03/2026 00:00"
 */
export function formatDateTime(value) {
  const fecha = parseLocalDate(value);
  if (!fecha) return "";
  return `${formatDate(fecha)} ${formatTime(fecha)}`;
}
