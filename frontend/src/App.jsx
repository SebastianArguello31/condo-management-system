import { useEffect, useState } from "react";
import Login from "./features/auth/Login";
import { pagesForRole } from "./features/auth/navigation";
import UsersPage from "./features/users/UsersPage";
import BuildingsPage from "./features/units/BuildingsPage";
import UnitsPage from "./features/units/UnitsPage";
import IncidentsPage from "./features/incidents/IncidentsPage";
import EmployeesPage from "./features/users/EmployeesPage";
import AdminsPage from "./features/users/AdminsPage";
import SpecialtiesPage from "./features/users/SpecialtiesPage";
import EmployeeProfile from "./features/users/EmployeeProfile";
import ResidentsPage from "./features/users/ResidentsPage";
import ResidentHome from "./features/users/ResidentHome";
import EspaciosPage from "./features/espacios-comunes/EspaciosPage";
import { setAccessToken } from "./services/api";
import AppShell from "./components/AppShell";
import "./styles/users-ui.css";

const pages = {
  users: UsersPage, employees: EmployeesPage, admins: AdminsPage,
  specialties: SpecialtiesPage, buildings: BuildingsPage, units: UnitsPage,
  incidents: IncidentsPage, profile: EmployeeProfile,
  residents: ResidentsPage, residentHome: ResidentHome,
  espacios: EspaciosPage,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);

  function logout() {
    setAccessToken(null);
    setUser(null);
    setPage(null);
  }

  useEffect(() => {
    window.addEventListener("session-expired", logout);
    return () => window.removeEventListener("session-expired", logout);
  }, []);

  function login(result) {
    setAccessToken(result.access_token);
    setUser(result.user);
    setPage(result.user.rol === "ADMIN" ? "users" : pagesForRole(result.user.rol)[0]?.key ?? null);
  }

  function updateProfile(profile) {
    setUser((current) => current?.id_usuario === profile.id_usuario
      ? { ...current, nombre: profile.nombre, apellido: profile.apellido,
          email: profile.email, telefono: profile.telefono }
      : current);
  }

  if (!user) return <Login onLogin={login} />;

  const allowedPages = pagesForRole(user.rol);
  const selected = allowedPages.find((item) => item.key === page) ?? allowedPages[0];
  const Page = selected ? pages[selected.key] : null;

  return <AppShell user={user} pages={allowedPages} selected={selected}
    onNavigate={setPage} onLogout={logout}>
    {Page ? <Page key={selected.key} user={user} onProfileUpdated={updateProfile} />
      : <p>Tu cuenta no tiene pantallas habilitadas.</p>}
  </AppShell>;
}
