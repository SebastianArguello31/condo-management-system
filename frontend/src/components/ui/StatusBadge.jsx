/* Representa el estado con texto, color y forma.
 * Los presets normalizan el estado; tone y glyph permiten ajustar la presentación. */
import "./ui.css";

const PRESETS = {
  recibida: { tone: "info", glyph: "ring" },
  "en-revision": { tone: "info", glyph: "ring" },
  asignada: { tone: "info", glyph: "dot" },
  "en-proceso": { tone: "warning", glyph: "triangle" },
  "en-espera": { tone: "warning", glyph: "ring" },
  pendiente: { tone: "warning", glyph: "ring" },
  confirmada: { tone: "success", glyph: "square" },
  resuelta: { tone: "success", glyph: "square" },
  rechazada: { tone: "danger", glyph: "diamond" },
  /* Reservas: estados de cierre. CANCELADA (decisión de anular, punto,
   * atenuada); FINALIZADA es el cierre NORMAL del ciclo (check, tono info). */
  cancelada: { tone: "muted", glyph: "dot" },
  cerrada: { tone: "neutral", glyph: "dot" },
  finalizada: { tone: "info", glyph: "check" },
};

const NORMALIZE = (value) => String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
const DISPLAY = (value) => String(value ?? "").trim().replace(/_/g, " ");

export default function StatusBadge({ estado, tone, glyph, className = "" }) {
  const preset = PRESETS[NORMALIZE(estado)] ?? { tone: "neutral", glyph: "dot" };
  const activeTone = tone ?? preset.tone;
  const activeGlyph = glyph ?? preset.glyph;

  return (
    <span className={["ui-status", `ui-status-${activeTone}`, className].filter(Boolean).join(" ")}>
      <span className={`ui-status-glyph ui-status-${activeGlyph}`} aria-hidden="true" />
      <span>{DISPLAY(estado)}</span>
    </span>
  );
}

export { PRESETS as STATUS_PRESETS, NORMALIZE as normalizeStatus };
