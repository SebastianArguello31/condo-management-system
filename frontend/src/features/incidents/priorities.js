/* Override de StatusBadge para PRIORIDADES de incidencias (constante de
 * módulo, ÚNICA fuente: la importan IncidentsPage e IncidentsDetailModal;
 * misma decisión de §8-bis: nada de presets nuevos en el kit). Baja es
 * muted/ring (punto hueco) para DISTINGUIRLA de Normal (neutral/dot);
 * Alta warning/triangle y Urgente danger/diamond. Cualquier valor fuera
 * del mapa cae en el default del kit (neutral/dot) porque el spread
 * queda vacío. El glifo es aria-hidden y StatusBadge SIEMPRE pinta el
 * texto del nivel, así que no se pierde. */
export const PRIORIDAD_TONO = {
  baja: { tone: "muted", glyph: "ring" },
  normal: { tone: "neutral", glyph: "dot" },
  alta: { tone: "warning", glyph: "triangle" },
  urgente: { tone: "danger", glyph: "diamond" },
};
