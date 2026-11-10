/* Tonos y glifos compartidos para las prioridades de incidencias.
 * StatusBadge conserva el texto y usa su presentación predeterminada para valores desconocidos. */
export const PRIORIDAD_TONO = {
  baja: { tone: "muted", glyph: "ring" },
  normal: { tone: "neutral", glyph: "dot" },
  alta: { tone: "warning", glyph: "triangle" },
  urgente: { tone: "danger", glyph: "diamond" },
};
