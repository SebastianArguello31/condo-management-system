/* ==========================================================================
 * validate(form, schema) → { campo: mensaje }
 * - Igual que BaseSchema.trim_strings del backend: recorta los strings
 *   (excepto password) antes de validar (no muta el form).
 * - Por campo corre las reglas en orden y reporta el PRIMER mensaje.
 * - Campos ausentes del form: undefined → las reglas de requerido()
 *   los marcan; el resto ignora.
 * ========================================================================== */

export function validate(form, schema) {
  const errores = {};
  for (const [campo, reglas] of Object.entries(schema)) {
    const raw = form?.[campo];
    const value = typeof raw === "string" && campo !== "password" ? raw.trim() : raw;
    for (const regla of reglas) {
      const mensaje = regla(value, form);
      if (mensaje) {
        errores[campo] = mensaje;
        break;
      }
    }
  }
  return errores;
}
