/* ==========================================================================
 * Schemas de validación del FRONT, espejando los schemas Marshmallow REALES
 * del backend (solo lectura; no se inventan reglas). Cada bloque indica el
 * archivo y la clase de origen. NO conectado a pantallas todavía (CP6a).
 * ========================================================================== */

import {
  contrasena,
  correo,
  entero,
  fecha,
  hora,
  listaDeEnteros,
  longitud,
  maximo,
  requerido,
} from "./rules";

/* Origen: backend/app/modules/users/schemas/accounts.py — AccountSchema /
 * UserCreateSchema / ResidentCreateSchema / EmployeeCreateSchema /
 * AdminCreateSchema. (El backend hace pre_load: email trim + lowercase;
 * el trim del resto lo aplica validate()). */
export const cuenta = {
  nombre: [requerido(), longitud(1, 150)],
  apellido: [requerido(), longitud(1, 150)],
  email: [requerido(), correo(), maximo(254)],
  telefono: [requerido(), longitud(1, 40)],
  password: [requerido(), contrasena()],
};

/* Origen: accounts.py — UserCreateSchema (+ id_rol positive_id). */
export const cuentaAdmin = { ...cuenta, id_rol: [requerido(), entero()] };

/* Origen: backend/app/modules/users/schemas/residents.py — ResidentCreateSchema. */
export const cuentaResidente = { ...cuenta, id_unidad: [requerido(), entero()] };

/* Origen: backend/app/modules/users/schemas/employees.py — EmployeeCreateSchema:
 * especialidad_ids = List(positive_id(), min=1). */
export const cuentaEmpleado = {
  ...cuenta,
  especialidad_ids: [requerido(), listaDeEnteros(1)],
};

/* Origen: backend/app/modules/auth/schemas.py — LoginSchema (password aquí
 * es 1–200, NO la política de 8 chars/72 bytes; esa solo aplica a cuentas). */
export const login = {
  email: [requerido(), correo()],
  password: [requerido(), longitud(1, 200)],
};

/* Origen: backend/app/modules/users/schemas/employees.py —
 * EmployeeProfileUpdateSchema (email requerido). */
export const perfilEmpleado = {
  nombre: [requerido(), longitud(1, 150)],
  apellido: [requerido(), longitud(1, 150)],
  email: [requerido(), correo(), maximo(254)],
  telefono: [requerido(), longitud(1, 40)],
};

/* Origen: backend/app/modules/users/schemas/residents.py —
 * ResidentProfileUpdateSchema (email OPCIONAL pero Email si viene). */
export const perfilResidente = {
  nombre: [requerido(), longitud(1, 150)],
  apellido: [requerido(), longitud(1, 150)],
  email: [correo(), maximo(254)],
  telefono: [requerido(), longitud(1, 40)],
};

/* Origen: backend/app/core/passwords.py — validate_password (uso aislado,
 * p. ej. cambio de contraseña). */
export const contrasenaNueva = { password: [requerido(), contrasena()] };

/* Origen: backend/app/modules/incidents/schemas.py — IncidentCreateSchema. */
export const incidenciaCrear = {
  titulo: [requerido(), longitud(5, 150)],
  descripcion: [requerido(), longitud(10, 5000)],
  id_unidad: [requerido(), entero()],
  id_tipo_incidencia: [requerido(), entero()],
};

/* Origen: backend/app/modules/incidents/schemas.py — IncidentPriorityUpdateSchema. */
export const incidenciaPrioridad = { id_prioridad: [requerido(), entero()] };

/* Origen: backend/app/modules/incidents/schemas.py — InterventionCreateSchema. */
export const intervencionCrear = { resultado: [requerido(), longitud(5, 5000)] };

/* Origen: backend/app/modules/reservations/schemas.py — ReservationCreateSchema. */
export const reservaCrear = {
  id_espacio: [requerido(), entero()],
  fecha: [requerido(), fecha()],
  hora_inicio: [requerido(), hora()],
  hora_fin: [requerido(), hora()],
  cantidad_personas: [requerido(), entero()],
  id_tipo_evento: [requerido(), entero()],
  observaciones: [maximo(500)],
};

/* Origen: backend/app/modules/users/schemas/specialties.py — SpecialtyCreateSchema. */
export const especialidadCrear = {
  nombre: [requerido(), longitud(1, 100)],
  descripcion: [maximo(500)],
};
