export const navigation = [
  { key: "incidents", label: "Incidencias", roles: ["ADMIN", "RESIDENTE", "TECNICO"] },
  { key: "residentHome", label: "Mi perfil y unidad", roles: ["RESIDENTE"] },
  { key: "misReservas", label: "Mis reservas", roles: ["RESIDENTE"] },
  { key: "profile", label: "Mi perfil", roles: ["TECNICO"] },
  { key: "users", label: "Usuarios y accesos", roles: ["ADMIN"] },
  { key: "employees", label: "Empleados", roles: ["ADMIN"] },
  { key: "specialties", label: "Especialidades", roles: ["ADMIN"] },
  { key: "admins", label: "Administradores", roles: ["ADMIN"] },
  { key: "residents", label: "Residentes", roles: ["ADMIN"] },
  { key: "buildings", label: "Edificios", roles: ["ADMIN"] },
  { key: "units", label: "Unidades", roles: ["ADMIN"] },
  { key: "espacios", label: "Espacios comunes", roles: ["ADMIN"] },
  { key: "gestionReservas", label: "Gestión de reservas", roles: ["ADMIN"] },
];

export function pagesForRole(role) {
  return navigation.filter((item) => item.roles.includes(role));
}
