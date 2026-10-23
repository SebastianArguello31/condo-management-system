/* ==========================================================================
 * Configuración declarativa de rutas y navegación (única en el proyecto).
 * Router por hash: #/<ruta>?clave=valor (parseo en hooks/useHashRoute.js).
 * AppShell y App reciben los datos YA RESUELTOS por rol desde aquí: este es
 * el único archivo que conoce ítems, grupos y componentes.
 *
 * Cada ítem: path (única), label, icon, component y roles con permiso.
 * GRUPOS: rol → grupos ordenados → ids de ITEMS (los grupos y su orden se
 * resuelven por rol; AppShell no conoce claves de módulos).
 * ========================================================================== */

import { lazy } from "react";

import UsersPage from "../features/users/UsersPage";
import EmployeesPage from "../features/users/EmployeesPage";
import AdminsPage from "../features/users/AdminsPage";
import SpecialtiesPage from "../features/users/SpecialtiesPage";
import ResidentsPage from "../features/users/ResidentsPage";
import ResidentHome from "../features/users/ResidentHome";
import EmployeeProfile from "../features/users/EmployeeProfile";
import BuildingsPage from "../features/units/BuildingsPage";
import UnitsPage from "../features/units/UnitsPage";
import IncidentsPage from "../features/incidents/IncidentsPage";
import EspaciosPage from "../features/espacios-comunes/EspaciosPage";
import MisReservasPage from "../features/reservas/MisReservasPage";
import GestionReservasPage from "../features/reservas/GestionReservasPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import MaintenancePage from "../features/maintenance/MaintenancePage";

const ADMIN = "ADMIN";
const RESIDENTE = "RESIDENTE";
const TECNICO = "TECNICO";

const ITEMS = {
  dashboard: {
    path: "/dashboard",
    label: "Dashboard e Indicadores",
    icon: "dashboard",
    component: DashboardPage,
    roles: [ADMIN, TECNICO],
  },
  incidencias: {
    path: "/incidencias",
    label: "Incidencias",
    icon: "incidents",
    component: IncidentsPage,
    roles: [ADMIN, RESIDENTE, TECNICO],
  },
  miPerfil: {
    path: "/mi-perfil",
    label: "Mi perfil y unidad",
    icon: "residentHome",
    component: ResidentHome,
    roles: [RESIDENTE],
  },
  misReservas: {
    path: "/mis-reservas",
    label: "Mis reservas",
    icon: "reservations",
    component: MisReservasPage,
    roles: [RESIDENTE],
  },
  perfil: {
    path: "/perfil",
    label: "Mi perfil",
    icon: "profile",
    component: EmployeeProfile,
    roles: [TECNICO],
  },
  usuarios: {
    path: "/usuarios",
    label: "Usuarios y accesos",
    icon: "users",
    component: UsersPage,
    roles: [ADMIN],
  },
  empleados: {
    path: "/empleados",
    label: "Empleados",
    icon: "employees",
    component: EmployeesPage,
    roles: [ADMIN],
  },
  especialidades: {
    path: "/especialidades",
    label: "Especialidades",
    icon: "specialties",
    component: SpecialtiesPage,
    roles: [ADMIN],
  },
  administradores: {
    path: "/administradores",
    label: "Administradores",
    icon: "admins",
    component: AdminsPage,
    roles: [ADMIN],
  },
  residentes: {
    path: "/residentes",
    label: "Residentes",
    icon: "residents",
    component: ResidentsPage,
    roles: [ADMIN],
  },
  edificios: {
    path: "/edificios",
    label: "Edificios",
    icon: "buildings",
    component: BuildingsPage,
    roles: [ADMIN],
  },
  unidades: {
    path: "/unidades",
    label: "Unidades",
    icon: "units",
    component: UnitsPage,
    roles: [ADMIN],
  },
  espacios: {
    path: "/espacios",
    label: "Espacios comunes",
    icon: "espacios",
    component: EspaciosPage,
    roles: [ADMIN],
  },
  gestionReservas: {
    path: "/gestion/reservas",
    label: "Gestión de reservas",
    icon: "reservationsGestion",
    component: GestionReservasPage,
    roles: [ADMIN],
  },
  /* Insumos (Dev 2, estilo legado de develop): clave de pantalla "maintenance",
   * icono con el mismo nombre (path ya preexistente en el kit de iconos). */
  insumos: {
    path: "/insumos",
    label: "Insumos",
    icon: "maintenance",
    component: MaintenancePage,
    roles: [ADMIN, TECNICO],
  },
};

/* Pantalla por defecto por rol (decisión actualizada en la integración con
 * develop: el ADMIN y el TECNICO aterrizan en el Dashboard; el residente
 * sigue en Incidencias). */
const RUTA_INICIAL = {
  [ADMIN]: "dashboard",
  [RESIDENTE]: "incidencias",
  [TECNICO]: "dashboard",
};

const GRUPOS = {
  [ADMIN]: [
    {
      label: "Personas",
      items: ["usuarios", "empleados", "especialidades", "administradores", "residentes"],
    },
    {
      label: "Comunidad",
      items: ["dashboard", "incidencias", "insumos", "edificios", "unidades", "espacios", "gestionReservas"],
    },
  ],
  [RESIDENTE]: [
    { label: "Personas", items: ["miPerfil"] },
    { label: "Comunidad", items: ["incidencias", "misReservas"] },
  ],
  [TECNICO]: [
    { label: "Personas", items: ["perfil"] },
    { label: "Comunidad", items: ["dashboard", "incidencias", "insumos"] },
  ],
};

export function navigationForRole(rol) {
  return (GRUPOS[rol] ?? [])
    .map((grupo) => ({
      label: grupo.label,
      items: grupo.items.map((id) => ITEMS[id]).filter((item) => item && item.roles.includes(rol)),
    }))
    .filter((grupo) => grupo.items.length > 0);
}

export function routeForPath(path) {
  return Object.values(ITEMS).find((item) => item.path === path) ?? null;
}

export function defaultRouteFor(rol) {
  return ITEMS[RUTA_INICIAL[rol]] ?? null;
}

/* Clave de pantalla estilo legado (la que usaba el App.jsx de develop y que
 * las pantallas de otros devs pasan a onNavigate, p. ej. DashboardPage llama
 * onNavigate("incidents") / onNavigate("employees")) → id de ITEMS de este
 * router. Las claves cuyo id ya coincide con ITEMS (dashboard, misReservas,
 * espacios, gestionReservas, profile…) van directo por el fallback. */
const CLAVE_PANTALLA = {
  dashboard: "dashboard",
  incidents: "incidencias",
  maintenance: "insumos",
  users: "usuarios",
  employees: "empleados",
  specialties: "especialidades",
  admins: "administradores",
  residents: "residentes",
  buildings: "edificios",
  units: "unidades",
  residentHome: "miPerfil",
  misReservas: "misReservas",
  espacios: "espacios",
  gestionReservas: "gestionReservas",
  profile: "perfil",
};

/* Adaptador para onNavigate(clave) de las pantallas de develop: traduce la
 * clave a la ruta hash de este router. `params` (opcional, no lo usa ninguna
 * pantalla hoy) se serializa como query string, igual que el resto del
 * router (#/<ruta>?clave=valor). */
export function rutaDesdeClavePantalla(clave, params) {
  const item = ITEMS[CLAVE_PANTALLA[clave] ?? clave] ?? null;
  if (!item) return null;
  const query = params ? new URLSearchParams(params).toString() : "";
  return query ? `${item.path}?${query}` : item.path;
}

/* Ruta SOLO DEV: #/ui — guía visual viva de los componentes (ADMIN).
 * Registrada en ESTA config pero nunca en GRUPOS: invisible en el menú y
 * desconocida para la resolución normal de rutas. El componente va en
 * import dinámico: en el build de producción import.meta.env.DEV es false,
 * la rama muere y el módulo NO entra al bundle (Vite no genera su chunk). */
const UiGuideDev = import.meta.env.DEV ? lazy(() => import("../dev/ui-guide.jsx")) : null;

export const rutaSoloDev = UiGuideDev
  ? {
      path: "/ui",
      label: "Guía de UI",
      icon: "espacios",
      component: UiGuideDev,
      roles: [ADMIN],
      devOnly: true,
    }
  : null;
