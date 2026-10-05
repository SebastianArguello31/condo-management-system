const accountFields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 150 },
  { name: "apellido", label: "Apellido", required: true, maxLength: 150 },
  { name: "email", label: "Correo electrónico", type: "email", required: true, maxLength: 254 },
  { name: "telefono", label: "Teléfono", required: true, maxLength: 40 },
  { name: "password", label: "Contraseña", type: "password", required: true },
  { name: "activo", label: "Cuenta activa", type: "checkbox" },
];

export const managementConfig = {
  users: {
    title: "Usuarios y accesos", eyebrow: "CONTROL DE ACCESO", singular: "acceso",
    description: "Gestiona quién puede acceder a tu comunidad desde un solo lugar.",
    endpoint: "/users", id: "id_usuario", create: false, remove: true,
    fields: [{ name: "activo", label: "Cuenta activa", type: "checkbox" }],
  },
  employees: {
    title: "Empleados", eyebrow: "EQUIPO DE TRABAJO", singular: "empleado", newLabel: "Nuevo empleado",
    description: "Organiza a tu equipo y las especialidades laborales que desempeña.",
    endpoint: "/employees", id: "id_usuario", create: true, remove: true, fields: accountFields,
  },
  admins: {
    title: "Administradores", eyebrow: "ADMINISTRACIÓN", singular: "administrador", newLabel: "Nuevo administrador",
    description: "Administra las cuentas responsables de la gestión de la comunidad.",
    endpoint: "/admins", id: "id_usuario", create: true, remove: true, fields: accountFields,
  },
  specialties: {
    title: "Especialidades", eyebrow: "CATÁLOGO LABORAL", singular: "especialidad", newLabel: "Nueva especialidad",
    description: "Un único catálogo para los cargos laborales: electricidad, limpieza, seguridad y más.",
    endpoint: "/specialties", id: "id_especialidad", create: true, remove: true,
    fields: [
      { name: "nombre", label: "Nombre de la especialidad", required: true, maxLength: 100 },
      { name: "descripcion", label: "Descripción", type: "textarea", maxLength: 500 },
      { name: "activo", label: "Especialidad activa", type: "checkbox" },
    ],
  },
};

export const roleLabels = { ADMIN: "Administrador", TECNICO: "Empleado", RESIDENTE: "Residente" };
export function recordName(record) {
  return [record.nombre, record.apellido].filter(Boolean).join(" ");
}
