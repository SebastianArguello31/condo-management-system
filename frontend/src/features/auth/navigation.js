export const navigation = [
  { key: "incidents", label: "Solicitudes", roles: ["ADMIN", "RESIDENTE"] },
  { key: "profile", label: "Mi perfil", roles: ["TECNICO"] },
  { key: "users", label: "Usuarios y accesos", roles: ["ADMIN"] },
  { key: "employees", label: "Empleados", roles: ["ADMIN"] },
  { key: "specialties", label: "Especialidades", roles: ["ADMIN"] },
  { key: "admins", label: "Administradores", roles: ["ADMIN"] },
  { key: "buildings", label: "Edificios", roles: ["ADMIN"] },
  { key: "units", label: "Unidades", roles: ["ADMIN"] },
];

export function pagesForRole(role) {
  return navigation.filter((item) => item.roles.includes(role));
}
