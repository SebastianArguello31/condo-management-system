/* Valida sin mutar el formulario: recorta textos salvo password y devuelve el primer error por campo. */

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
