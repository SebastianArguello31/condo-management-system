/* Insignia de estado: glifo de forma propia + texto (nunca solo color).
 * tone y glyph se deducen de presets por estado conocido; aceptan override.
 * glifos: dot (círculo lleno), ring (círculo hueco), square, diamond, triangle.
 * tone: neutral | info | success | warning | danger | muted.
 */
import "./ui.css";

const PRESETS = {
  recibida: { tone: "info", glyph: "ring" },
  asignada: { tone: "info", glyph: "dot" },
  "en-proceso": { tone: "warning", glyph: "triangle" },
  pendiente: { tone: "warning", glyph: "ring" },
  aprobada: { tone: "success", glyph: "square" },
  aceptada: { tone: "success", glyph: "square" },
  confirmada: { tone: "success", glyph: "square" },
  resuelta: { tone: "success", glyph: "square" },
  rechazada: { tone: "danger", glyph: "diamond" },
  vencida: { tone: "danger", glyph: "diamond" },
  cancelada: { tone: "neutral", glyph: "dot" },
  cerrada: { tone: "neutral", glyph: "dot" },
};

const NORMALIZE = (value) => String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");

export default function StatusBadge({ estado, tone, glyph, className = "" }) {
  const preset = PRESETS[NORMALIZE(estado)] ?? { tone: "neutral", glyph: "dot" };
  const activeTone = tone ?? preset.tone;
  const activeGlyph = glyph ?? preset.glyph;

  return (
    <span className={["ui-status", `ui-status-${activeTone}`, className].filter(Boolean).join(" ")}>
      <span className={`ui-status-glyph ui-status-${activeGlyph}`} aria-hidden="true" />
      <span>{estado}</span>
    </span>
  );
}

export { PRESETS as STATUS_PRESETS, NORMALIZE as normalizeStatus };
