/* Etiquetas legibles de rol (F2-12b): única fuente para pantalla y shell,
 * nunca el código crudo (ADMIN/TECNICO/RESIDENTE). AppShell adopta este
 * módulo en F2-12a. */
export const ROLE_LABELS = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  TECNICO: "Técnico",
  RESIDENTE: "Residente",
};

export function roleLabel(rol) {
  return ROLE_LABELS[rol] ?? rol;
}
