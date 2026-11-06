/* ==========================================================================
 * Schemas de validación del FRONT, espejando los schemas Marshmallow REALES
 * del backend (solo lectura; no se inventan reglas). Cada bloque indica el
 * archivo y la clase de origen. NO conectado a pantallas todavía (CP6a).
 * ========================================================================== */

import {
  contrasena,
  correo,
  decimal,
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

/* Origen: backend/app/modules/common_spaces/schemas.py — SpaceCreateSchema.
 * Sin `activo`: el POST de espacios no lo acepta (solo PATCH al editar).
 */
export const espacioCrear = {
  nombre: [requerido(), longitud(1, 150)],
  descripcion: [maximo(1000)],
  capacidad: [requerido(), entero(1)],
  id_edificio: [requerido(), entero(1)],
};

/* Origen: backend/app/modules/common_spaces/schemas.py — PolicySchema.
 * politicaCrear(capacidad) es un FACTORY (la pantalla le pasa la capacidad
 * del espacio como número, o null si no la tiene): NO vive una regla de
 * capacidad en el schema del backend (la superación llega como Conflict
 * 409 de services.save_policy), así que el aforo es REGLA DE PANTALLA y
 * con capacidad null se omite (el backend responde de todos modos). Las
 * reglas cruzadas del @validates_schema del backend se copian con su
 * MENSAJE EXACTO montadas en el campo que las dispara. */
const monto = (value) => {
  const texto = String(value ?? "").trim();
  const numero = Number(texto);
  if (texto === "" || Number.isNaN(numero)) return "Ingresa un número válido.";
  if (numero < 0) return "No puede ser menor que 0.";
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return "Máximo 2 decimales.";
  return null;
};

export function politicaCrear(capacidad = null) {
  return {
    id_tipo_evento: [requerido(), entero(1)],
    hora_apertura: [requerido(), hora()],
    hora_cierre: [
      requerido(),
      hora(),
      (value, form) =>
        value && form?.hora_apertura && value <= form.hora_apertura
          ? "El cierre debe ser posterior a la apertura"
          : null,
    ],
    duracion_max_horas: [
      requerido(),
      (value) => {
        const numero = Number(value);
        if (!Number.isInteger(numero)) return "Debe ser un número entero.";
        return numero < 1 || numero > 24
          ? "Debe ser un número entero entre 1 y 24."
          : null;
      },
    ],
    dias_anticipacion_min: [requerido(), entero(0)],
    dias_anticipacion_max: [
      requerido(),
      entero(0),
      (value, form) =>
        value !== undefined && value !== null && value !== "" &&
        Number(value) < Number(form?.dias_anticipacion_min ?? 0)
          ? "La anticipación máxima debe ser mayor o igual a la mínima"
          : null,
    ],
    aforo_maximo: [
      requerido(),
      entero(1),
      (value) =>
        capacidad != null && Number(value) > capacidad
          ? "El aforo de la política supera la capacidad del espacio"
          : null,
    ],
    costo: [requerido(), monto],
    deposito_garantia: [requerido(), monto],
    penalizaciones: [requerido(), monto],
  };
}

/* Origen: backend/app/modules/users/schemas/specialties.py — SpecialtyCreateSchema. */
export const especialidadCrear = {
  nombre: [requerido(), longitud(1, 100)],
  descripcion: [maximo(500)],
};

/* Origen: backend/app/modules/maintenance/schemas.py — InsumoCreateSchema:
 * stock_minimo Decimal places=3 + Range(min=0); costo_unitario OPCIONAL
 * (load_default="0") Decimal places=2 + Range(min=0). Sin `activo`. */
export const insumoCrear = {
  nombre: [requerido(), longitud(2, 150)],
  descripcion: [maximo(2000)],
  categoria: [requerido(), longitud(2, 80)],
  unidad_medida: [requerido(), longitud(1, 40)],
  stock_minimo: [requerido(), decimal(3)],
  costo_unitario: [decimal(2)],
};

/* Origen: ídem — InsumoUpdateSchema (TODOS los campos opcionales; el
 * backend además acepta `activo` en el PATCH, pero la UI NO lo expone
 * (decisión F2-10b) y no se toca desde este form, así que no lleva regla). */
export const insumoEditar = {
  nombre: [longitud(2, 150)],
  descripcion: [maximo(2000)],
  categoria: [longitud(2, 80)],
  unidad_medida: [longitud(1, 40)],
  stock_minimo: [decimal(3)],
  costo_unitario: [decimal(2)],
};
