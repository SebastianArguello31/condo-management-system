/* ==========================================================================
 * TEMPORAL — Arnés de validaciones (CP6a). ELIMINAR EN CP6b.
 * No está importado por la aplicación: con `npm run dev` corriendo, en la
 * consola del navegador:
 *
 *   await import("/src/dev/validations-smoke.jsx").then((m) => m.mountValidationsSmoke())
 *
 * Panel con dos partes:
 *  1) Suite local de validate(): casos contra los schemas de
 *     src/validations (mira formato y límites REALES del backend).
 *  2) api() en vivo contra el backend: POST login vacío err.errors,
 *     y aborto con signal.
 * Desmontar con __validationsSmokeUnmount() en consola.
 * ========================================================================== */

import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { api } from "../services/api";
import { routes } from "../services/routes";
import {
  cuenta,
  cuentaEmpleado,
  especialidadCrear,
  incidenciaCrear,
  intervencionCrear,
  login,
  perfilResidente,
  reservaCrear,
  validate,
} from "../validations";

/* [descripcion, schema, form, clavesConError (subset), clavesSinError (resto)] */
const CASOS = [
  ["cuenta válida pasa", cuenta, {
    nombre: " Ana ", apellido: "Pérez", email: "ana@test.com",
    telefono: "0981 123 456", password: "ClaveSegura1",
  }, [], ["nombre", "apellido", "email", "telefono", "password"]],
  ["cuenta: requeridos faltan (trim)", cuenta, { nombre: "   " }, ["nombre", "apellido", "email", "telefono", "password"], []],
  ["cuenta: email inválido", cuenta, { nombre: "A", apellido: "P", email: "sin-arroba", telefono: "1", password: "ClaveSegura1" }, ["email"], []],
  ["cuenta: password 7 chars", cuenta, { nombre: "A", apellido: "P", email: "a@b.co", telefono: "1", password: "1234567" }, ["password"], []],
  ["cuenta: password 8 chars pasa", cuenta, { nombre: "A", apellido: "P", email: "a@b.co", telefono: "1", password: "12345678" }, [], ["password"]],
  ["cuenta: password 8 'ñ' (16 bytes) pasa", cuenta, { nombre: "A", apellido: "P", email: "a@b.co", telefono: "1", password: "ññññññññ" }, [], ["password"]],
  ["cuenta: password 73 bytes", cuenta, { nombre: "A", apellido: "P", email: "a@b.co", telefono: "1", password: "a".repeat(73) }, ["password"], []],
  ["cuenta: password 72 bytes pasa", cuenta, { nombre: "A", apellido: "P", email: "a@b.co", telefono: "1", password: "a".repeat(72) }, [], ["password"]],
  ["login: password NUNCA exige política (1-200)", login, { email: "a@b.co", password: "1" }, [], ["email", "password"]],
  ["empleado: especialidad_ids list", cuentaEmpleado, {
    nombre: "A", apellido: "P", email: "a@b.co", telefono: "1",
    password: "ClaveSegura1", especialidad_ids: [],
  }, ["especialidad_ids"], []],
  ["empleado: ids no enteros", cuentaEmpleado, {
    nombre: "A", apellido: "P", email: "a@b.co", telefono: "1",
    password: "ClaveSegura1", especialidad_ids: ["2.5"],
  }, ["especialidad_ids"], []],
  ["incidencia: título 4 chars", incidenciaCrear, { titulo: "corto", descripcion: "descripción larga de diez", id_unidad: "3", id_tipo_incidencia: 2 }, ["titulo"], []],
  ["incidencia: descripción 9 chars", incidenciaCrear, { titulo: "Título largo", descripcion: "123456789", id_unidad: "3", id_tipo_incidencia: 2 }, ["descripcion"], []],
  ["incidencia: entero decimal", incidenciaCrear, { titulo: "Título largo", descripcion: "descripción larga de diez", id_unidad: "3.5", id_tipo_incidencia: 2 }, ["id_unidad"], []],
  ["incidencia: válida pasa", incidenciaCrear, { titulo: "Fuga en baño", descripcion: "Descripción completa aquí", id_unidad: 3, id_tipo_incidencia: 2 }, [], ["titulo", "descripcion", "id_unidad", "id_tipo_incidencia"]],
  ["intervención: 4 chars", intervencionCrear, { resultado: "1234" }, ["resultado"], []],
  ["reserva: fecha y horas", reservaCrear, { id_espacio: 1, fecha: "2026-13-40", hora_inicio: "25:00", hora_fin: "9:30", cantidad_personas: 0, id_tipo_evento: 1, observaciones: "" }, ["fecha", "hora_inicio", "hora_fin", "cantidad_personas"], ["id_espacio", "id_tipo_evento", "observaciones"]],
  ["reserva: válida pasa", reservaCrear, { id_espacio: 1, fecha: "2026-10-20", hora_inicio: "18:30", hora_fin: "22:00", cantidad_personas: 10, id_tipo_evento: 1, observaciones: "Cumpleaños" }, [], ["id_espacio", "fecha", "hora_inicio", "hora_fin", "cantidad_personas", "id_tipo_evento", "observaciones"]],
  ["perfil residente: email opcional", perfilResidente, { nombre: "A", apellido: "P", telefono: "1" }, [], ["email", "nombre", "apellido", "telefono"]],
  ["especialidad: nombre > 100", especialidadCrear, { nombre: "x".repeat(101) }, ["nombre"], []],
];

function ejecutarSuite() {
  const resultados = [];
  for (const [descripcion, schema, form, esperados, sinError] of CASOS) {
    const errores = validate(form, schema);
    const faltantes = esperados.filter((campo) => !errores[campo]);
    const sobrantes = sinError.filter((campo) => errores[campo]);
    const bien = faltantes.length === 0 && sobrantes.length === 0;
    resultados.push(
      `${bien ? "PASS" : "FAIL"} · ${descripcion}`
      + (!bien ? ` — faltaban: ${JSON.stringify(faltantes)}, sobraban: ${JSON.stringify(sobrantes)}, era: ${JSON.stringify(errores)}` : "")
    );
  }
  return resultados;
}

async function pruebaApiErrors(log) {
  try {
    await api(`${routes.auth}/login`, { method: "POST", body: {} });
    log("inesperado: el login vacío NO devolvió error");
  } catch (err) {
    log(`api() → status=${err.status} · message="${err.message}"`);
    log(`api() → err.errors=${JSON.stringify(err.errors)}`);
    log(err.status === 400 && err.errors && "email" in err.errors
      ? "PASS · err.errors con claves de campo (400)"
      : "FAIL · esperaba 400 + errors con claves");
  }
}

async function pruebaApiSignal(log) {
  const controller = new AbortController();
  const promesa = api(`${routes.incidents}`, { signal: controller.signal });
  controller.abort();
  try {
    await promesa;
    log("FAIL · el fetch ignoró la signal");
  } catch (err) {
    const abortado = err.name === "AbortError";
    log(abortado
      ? "PASS · signal abortada → AbortError (sin 'session-expired' falsos)"
      : `FAIL · name=${err.name}`);
  }
}

function PanelValidaciones() {
  const [lineas, setLineas] = useState([]);
  const log = (texto) => setLineas((actuales) => [...actuales, texto]);

  return <div style={{
    position: "fixed", inset: "auto auto 16px 16px", zIndex: "var(--z-modal)",
    maxWidth: 560, padding: "var(--space-4)", background: "var(--surface)",
    border: "1px solid var(--line)", borderRadius: "var(--radius-md)",
    font: "var(--fs-13)/var(--lh-13) var(--font-ui)", color: "var(--ink)",
  }}>
    <p style={{ margin: "0 0 var(--space-2)", color: "var(--brand)", fontWeight: 600 }}>
      Arnés de validaciones (CP6a) — temporal, eliminar en CP6b
    </p>
    <button
      type="button"
      onClick={() => setLineas(ejecutarSuite())}
      style={{ fontWeight: 600, padding: "var(--space-2) var(--space-3)", cursor: "pointer", width: "100%" }}
    >
      Suite validate() (20 casos)
    </button>
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <button
        type="button"
        onClick={async () => { setLineas([`api() en vivo…`]); await pruebaApiErrors(log); }}
        style={{ fontWeight: 600, cursor: "pointer" }}
      >
        api(): errores estructurados (login vacío, requiere backend en marcha)
      </button>
      <button
        type="button"
        onClick={async () => { setLineas([`api(signal)…`]); await pruebaApiSignal(log); }}
        style={{ fontWeight: 600, cursor: "pointer" }}
      >
        api(): AbortController (signal)
      </button>
    </div>
    <ul style={{ margin: "var(--space-3) 0 0", paddingInlineStart: "var(--space-4)", display: "grid", gap: "var(--space-1)", whiteSpace: "pre-wrap" }}>
      {lineas.map((linea, i) => <li key={i}>{linea}</li>)}
    </ul>
  </div>;
}

let rootAccesible = null;

export function mountValidationsSmoke() {
  if (rootAccesible) return;
  const contenedor = document.createElement("div");
  contenedor.id = "validations-smoke-root";
  document.body.appendChild(contenedor);
  rootAccesible = ReactDOM.createRoot(contenedor);
  rootAccesible.render(<PanelValidaciones />);
  window.__validationsSmokeUnmount = () => {
    rootAccesible?.unmount();
    rootAccesible = null;
    contenedor.remove();
    delete window.__validationsSmokeUnmount;
  };
}
