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

const ADMIN = "ADMIN";
const RESIDENTE = "RESIDENTE";
const TECNICO = "TECNICO";

const ITEMS = {
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
};

/* Pantalla por defecto por rol (igual que el comportamiento anterior: el
 * ADMIN entra a Usuarios y accesos; los demás, a Incidencias). */
const RUTA_INICIAL = {
  [ADMIN]: "usuarios",
  [RESIDENTE]: "incidencias",
  [TECNICO]: "incidencias",
};

const GRUPOS = {
  [ADMIN]: [
    {
      label: "Personas",
      items: ["usuarios", "empleados", "especialidades", "administradores", "residentes"],
    },
    {
      label: "Comunidad",
      items: ["incidencias", "edificios", "unidades", "espacios", "gestionReservas"],
    },
  ],
  [RESIDENTE]: [
    { label: "Personas", items: ["miPerfil"] },
    { label: "Comunidad", items: ["incidencias", "misReservas"] },
  ],
  [TECNICO]: [
    { label: "Personas", items: ["perfil"] },
    { label: "Comunidad", items: ["incidencias"] },
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
