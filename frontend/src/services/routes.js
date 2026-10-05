// Canonical resources, relative to API_BASE. Keep aligned with the Flask blueprints.
export const API_BASE = "/condominio";
export const routes = Object.freeze({
  auth: "/auth",
  users: "/users",
  admins: "/admins",
  employees: "/employees",
  residents: "/residents",
  specialties: "/specialties",
  buildings: "/buildings",
  buildingTypes: "/building-types",
  units: "/units",
  unitTypes: "/unit-types",
  incidents: "/incidents",
  reservations: "/reservations",
  commonSpaces: "/common-spaces",
});
