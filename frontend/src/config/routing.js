import { lazy } from "react";

import UsersPage from "../features/users/UsersPage";
import EmployeesPage from "../features/users/EmployeesPage";
import AdminsPage from "../features/users/AdminsPage";
import SpecialtiesPage from "../features/users/SpecialtiesPage";
import ResidentsPage from "../features/users/ResidentsPage";
import ResidentHome from "../features/users/ResidentHome";
import EmployeeProfile from "../features/users/EmployeeProfile";
import ManagersPage from "../features/users/ManagersPage";
import AccountProfile from "../features/users/AccountProfile";

import BuildingsPage from "../features/units/BuildingsPage";
import BuildingTypesPage from "../features/units/BuildingTypesPage";
import UnitsPage from "../features/units/UnitsPage";
import UnitTypesPage from "../features/units/UnitTypesPage";

import IncidentsPage from "../features/incidents/IncidentsPage";
import IncidentTypesPage from "../features/incidents/IncidentTypesPage";
import EspaciosPage from "../features/espacios-comunes/EspaciosPage";
import MisReservasPage from "../features/reservas/MisReservasPage";
import GestionReservasPage from "../features/reservas/GestionReservasPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import MaintenancePage from "../features/maintenance/MaintenancePage";
import InsumoCategoriesPage from "../features/maintenance/InsumoCategoriesPage";

const ADMIN = "ADMIN";
const GESTOR = "GESTOR";
const RESIDENTE = "RESIDENTE";
const TECNICO = "TECNICO";

const ITEMS = {
  dashboard: {
    path: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    component: DashboardPage,
    roles: [ADMIN, GESTOR],
  },
  incidencias: {
    path: "/incidencias",
    label: "Incidencias",
    icon: "incidents",
    component: IncidentsPage,
    roles: [ADMIN, GESTOR, RESIDENTE, TECNICO],
  },
  tiposIncidencia: {
    path: "/tipos-incidencia",
    label: "Tipos de incidencia",
    icon: "incidents",
    component: IncidentTypesPage,
    roles: [ADMIN],
  },
  miPerfil: {
    path: "/mi-perfil",
    label: "Mi perfil",
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
  perfilCuenta: {
    path: "/mi-cuenta",
    label: "Mi perfil",
    icon: "profile",
    component: AccountProfile,
    roles: [ADMIN, GESTOR],
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
  tiposEdificio: {
    path: "/tipos-edificio",
    label: "Tipos de edificio",
    icon: "buildings",
    component: BuildingTypesPage,
    roles: [ADMIN],
  },
  tiposUnidad: {
    path: "/tipos-unidad",
    label: "Tipos de unidad",
    icon: "units",
    component: UnitTypesPage,
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
    roles: [ADMIN, GESTOR],
  },
  insumos: {
    path: "/insumos",
    label: "Insumos",
    icon: "maintenance",
    component: MaintenancePage,
    roles: [ADMIN, TECNICO],
  },
  categoriasInsumo: {
    path: "/categorias-insumo",
    label: "Categorías de insumos",
    icon: "maintenance",
    component: InsumoCategoriesPage,
    roles: [ADMIN],
  },
  gestores: {
    path: "/gestores",
    label: "Gestores",
    icon: "users",
    component: ManagersPage,
    roles: [ADMIN],
  },
};

const RUTA_INICIAL = {
  [ADMIN]: "dashboard",
  [GESTOR]: "dashboard",
  [RESIDENTE]: "incidencias",
  [TECNICO]: "incidencias",
};

const GRUPOS = {
  [ADMIN]: [
    { label: "Inicio", items: ["dashboard"] },
    {
      label: "Operación",
      items: ["incidencias", "insumos", "gestionReservas"],
    },
    {
      label: "Infraestructura",
      items: ["edificios", "unidades", "espacios"],
    },
    {
      label: "Personas",
      items: [
        "usuarios",
        "administradores",
        "gestores",
        "empleados",
        "residentes",
      ],
    },
    {
      label: "Catálogos",
      items: [
        "tiposIncidencia",
        "tiposEdificio",
        "tiposUnidad",
        "categoriasInsumo",
        "especialidades",
      ],
    },
    { label: "Cuenta", items: ["perfilCuenta"] },
  ],
  [GESTOR]: [
    { label: "Inicio", items: ["dashboard"] },
    {
      label: "Operación",
      items: ["incidencias", "gestionReservas"],
    },
    { label: "Cuenta", items: ["perfilCuenta"] },
  ],
  [RESIDENTE]: [
    {
      label: "Comunidad",
      items: ["incidencias", "misReservas"],
    },
    { label: "Cuenta", items: ["miPerfil"] },
  ],
  [TECNICO]: [
    {
      label: "Operación",
      items: ["incidencias", "insumos"],
    },
    { label: "Cuenta", items: ["perfil"] },
  ],
};

export function navigationForRole(rol) {
  return (GRUPOS[rol] ?? [])
    .map((grupo) => ({
      label: grupo.label,
      items: grupo.items
        .map((id) => ITEMS[id])
        .filter((item) => item && item.roles.includes(rol)),
    }))
    .filter((grupo) => grupo.items.length > 0);
}

export function routeForPath(path) {
  return Object.values(ITEMS).find((item) => item.path === path) ?? null;
}

export function defaultRouteFor(rol) {
  const item = ITEMS[RUTA_INICIAL[rol]];
  return item?.roles.includes(rol) ? item : null;
}

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
  accountProfile: "perfilCuenta",
  managers: "gestores",
};

export function rutaDesdeClavePantalla(clave, params) {
  const item = ITEMS[CLAVE_PANTALLA[clave] ?? clave] ?? null;
  if (!item) return null;

  const query = params ? new URLSearchParams(params).toString() : "";
  return query ? `${item.path}?${query}` : item.path;
}

const UiGuideDev = import.meta.env.DEV
  ? lazy(() => import("../dev/ui-guide.jsx"))
  : null;

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