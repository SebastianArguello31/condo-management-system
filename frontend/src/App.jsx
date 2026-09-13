import { useEffect, useState } from "react";

import Login from "./features/auth/Login";
import UsersPage from "./features/users/UsersPage";
import BuildingsPage from "./features/units/BuildingsPage";
import UnitsPage from "./features/units/UnitsPage";
import IncidentsPage from "./features/incidents/IncidentsPage";

import { setAccessToken } from "./services/api";

const pages = {
  users: UsersPage,
  buildings: BuildingsPage,
  units: UnitsPage,
  incidents: IncidentsPage,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("incidents");

  useEffect(() => {
    function expireSession() {
      setAccessToken(null);
      setUser(null);
    }

    window.addEventListener("session-expired", expireSession);

    return () => {
      window.removeEventListener("session-expired", expireSession);
    };
  }, []);

  function login(result) {
    setAccessToken(result.access_token);
    setUser(result.user);
    setPage("incidents");
  }

  function logout() {
    setAccessToken(null);
    setUser(null);
  }

  if (!user) return <Login onLogin={login} />;

  const isAdmin = user.rol === "ADMIN";
  const isResident = user.rol === "RESIDENTE";

  const Page = isAdmin ? pages[page] : IncidentsPage;

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Gestión de condominio</strong>
          <span>{user.nombre} · {user.rol}</span>
        </div>

        <button className="secondary" onClick={logout}>
          Cerrar sesión
        </button>
      </header>

      <main className="container">
        {isAdmin && (
          <nav aria-label="Administración">
            {[
              ["incidents", "Solicitudes"],
              ["users", "Usuarios"],
              ["buildings", "Edificios"],
              ["units", "Unidades"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={page === key ? "" : "secondary"}
                onClick={() => setPage(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        {isAdmin || isResident ? (
          <Page key={page} user={user} />
        ) : (
          <div className="card">
            <h1>Bienvenido, {user.nombre}</h1>
            <p>Tu cuenta no tiene acceso a este módulo.</p>
          </div>
        )}
      </main>
    </>
  );
}