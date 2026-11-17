#!/usr/bin/env node
/* ==========================================================================
   check-contrast.mjs — Verificación WCAG 2.1 de los pares definidos en
   src/styles/tokens.css. Sin dependencias.

   Uso (desde frontend/):
   node scripts/check-contrast.mjs

   - Pares "term" (texto): exigencia >= 4.5:1
   - Pares "nontext" (bordes de controles, glifos, gráficos): >= 3:1
   Exit 1 si algún par no cumple.
   Todos los valores se LEEN de tokens.css: si se cambia un token, el script
   usa el nuevo valor automáticamente. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const tokensPath = join(here, "..", "src", "styles", "tokens.css");

/* -- Carga y resolución de tokens ---------------------------------- */
const raw = readFileSync(tokensPath, "utf8");
const vars = new Map();
for (const [, name, value] of raw.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  vars.set(name.trim(), value.trim());
}

/** Normaliza el nombre de token: acepta "ink" o "--ink"/"---ink" y nunca
 *  duplica el prefijo. Se aplica en TODA consulta al mapa de tokens. */
const normName = (name) => String(name).replace(/^-+/, "");

function resolveToken(name, seen = new Set()) {
  const key = normName(name);
  if (seen.has(key)) throw new Error(`Referencia circular en ${name}`);
  seen.add(key);
  const value = vars.get(key);
  /* El mensaje muestra el nombre tal como se pidió (con sus guiones). */
  if (value === undefined) throw new Error(`Token ${name} (--${key}) no está definido`);
  return value.replace(/var\(--([a-z0-9-]+)\)/g, (_, inner) =>
    resolveToken(inner, seen)
  );
}

/* -- Cálculo de contraste ------------------------------------------- */
function parseHex(value) {
  const hex = value.trim();
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) throw new Error(`Color no soportado por el script: ${hex}`);
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function luminance([r, g, b]) {
  const lin = (c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg, bg) {
  const l1 = luminance(parseHex(resolveToken(fg)));
  const l2 = luminance(parseHex(resolveToken(bg)));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* -- Matriz de pares exigidos ---------------------------------------- */
const TEXT = 4.5;
const NONTEXT = 3.0;

const pairs = [
  ["Texto", "--ink", "--bg", TEXT],
  ["Texto", "--ink", "--surface", TEXT],
  ["Texto secund.", "--ink-2", "--bg", TEXT],
  ["Texto secund.", "--ink-2", "--surface", TEXT],
  ["Texto meta", "--ink-3", "--bg", TEXT],
  ["Texto meta", "--ink-3", "--surface", TEXT],
  ["Marca (texto/btn)", "--brand", "--bg", TEXT],
  ["Marca (texto/btn)", "--brand", "--surface", TEXT],
  ["Acento (texto)", "--accent", "--bg", TEXT],
  ["Acento (texto)", "--accent", "--surface", TEXT],
  ["On-brand", "--on-brand", "--brand", TEXT],
  ["On-brand hover", "--on-brand", "--brand-hover", TEXT],
  ["On-brand pressed", "--on-brand", "--brand-pressed", TEXT],
  ["On-accent", "--on-brand", "--accent", TEXT],
  ["On-accent hover", "--on-brand", "--accent-hover", TEXT],
  ["On-accent pressed", "--on-brand", "--accent-pressed", TEXT],

  ["Estado neutral", "--status-neutral-fg", "--status-neutral-bg", TEXT],
  ["Estado neutral", "--status-neutral-fg", "--bg", TEXT],
  ["Estado neutral", "--status-neutral-fg", "--surface", TEXT],
  ["Estado info", "--status-info-fg", "--status-info-bg", TEXT],
  ["Estado info", "--status-info-fg", "--bg", TEXT],
  ["Estado info", "--status-info-fg", "--surface", TEXT],
  ["Estado warning", "--status-warning-fg", "--status-warning-bg", TEXT],
  ["Estado warning", "--status-warning-fg", "--bg", TEXT],
  ["Estado warning", "--status-warning-fg", "--surface", TEXT],
  ["Estado success", "--status-success-fg", "--status-success-bg", TEXT],
  ["Estado success", "--status-success-fg", "--bg", TEXT],
  ["Estado success", "--status-success-fg", "--surface", TEXT],
  ["Estado danger", "--status-danger-fg", "--status-danger-bg", TEXT],
  ["Estado danger", "--status-danger-fg", "--bg", TEXT],
  ["Estado danger", "--status-danger-fg", "--surface", TEXT],
  ["Estado muted", "--status-muted-fg", "--status-muted-bg", TEXT],
  ["Estado muted", "--status-muted-fg", "--bg", TEXT],
  ["Estado muted", "--status-muted-fg", "--surface", TEXT],

  /* Pareja texto-casos reales dentro de fichas/marcas (fondos con tinte) */
  ["Tinte: secund.", "--ink-2", "--status-neutral-bg", TEXT],
  ["Tinte: secund.", "--ink-2", "--status-info-bg", TEXT],
  ["Tinte: secund.", "--ink-2", "--status-warning-bg", TEXT],
  ["Tinte: secund.", "--ink-2", "--status-success-bg", TEXT],
  ["Tinte: secund.", "--ink-2", "--status-danger-bg", TEXT],
  ["Tinte: secund.", "--ink-2", "--status-muted-bg", TEXT],
  ["Tinte: meta", "--ink-3", "--status-neutral-bg", TEXT],
  ["Tinte: meta", "--ink-3", "--status-info-bg", TEXT],
  ["Tinte: meta", "--ink-3", "--status-warning-bg", TEXT],
  ["Tinte: meta", "--ink-3", "--status-success-bg", TEXT],
  ["Tinte: meta", "--ink-3", "--status-danger-bg", TEXT],
  ["Tinte: meta", "--ink-3", "--status-muted-bg", TEXT],

  ["Borde control", "--line-control", "--bg", NONTEXT],
  ["Borde control", "--line-control", "--surface", NONTEXT],
  ["Anillo foco", "--focus-ring", "--bg", NONTEXT],
  ["Anillo foco", "--focus-ring", "--surface", NONTEXT],
  ["Gráfico 1", "--chart-1", "--bg", NONTEXT],
  ["Gráfico 1", "--chart-1", "--surface", NONTEXT],
  ["Gráfico 2", "--chart-2", "--bg", NONTEXT],
  ["Gráfico 2", "--chart-2", "--surface", NONTEXT],
  ["Gráfico 3", "--chart-3", "--bg", NONTEXT],
  ["Gráfico 3", "--chart-3", "--surface", NONTEXT],
  ["Gráfico 4", "--chart-4", "--bg", NONTEXT],
  ["Gráfico 4", "--chart-4", "--surface", NONTEXT],
  ["Gráfico 5", "--chart-5", "--bg", NONTEXT],
  ["Gráfico 5", "--chart-5", "--surface", NONTEXT],
  ["Gráfico 6", "--chart-6", "--bg", NONTEXT],
  ["Gráfico 6", "--chart-6", "--surface", NONTEXT],
];

/* -- Ejecución -------------------------------------------------------- */
const rows = [];
let failures = 0;

for (const [group, fg, bg, required] of pairs) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= required;
  if (!ok) failures += 1;
  rows.push({
    group,
    fg,
    bg,
    ratio,
    required,
    ok,
  });
}

const pct = (n, d) => n.toFixed(2).padStart(5, " ");
console.log("WCAG 2.1 — contraste de pares definidos en tokens.css");
console.log("");
console.log(
  "Gráf.              | fg                 | bg                 | ratio | req. | resultado"
);
console.log("-".repeat(104));
for (const r of rows) {
  console.log(
    `${r.group.padEnd(18)} | ${r.fg.padEnd(18)} | ${r.bg.padEnd(18)} | ${pct(
      r.ratio
    )} | ${r.required.toFixed(1).padStart(4, " ")} | ${
      r.ok ? "PASA" : "*** FALLA ***"
    }`
  );
}

console.log("");
if (failures > 0) {
  console.error(`FALLA: ${failures} par(es) no cumplen. Corrige tokens.css.`);
  process.exit(1);
} else {
  console.log(`OK: ${rows.length} pares cumplen (texto >= 4.5:1, no-texto >= 3:1).`);
}
