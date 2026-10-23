/* Router por hash + config declarativa (config/routing.js):
 * - Ruta del hash conocida Y permitida para el rol → esa pantalla.
 * - Hash vacío, inválido o sin permiso → pantalla por defecto del rol con
 *   navigate(..., { replace: true }) (nunca pantalla en blanco).
 * - Anclas de la página (p. ej. #main-content del skip link, sin "/" inicial)
 *   NO son rutas: no disparan el fallback, se conserva la pantalla actual.
 * - Tras login se respeta el hash de la URL si el rol lo permite (volver a
 *   lo solicitado); al cerrar sesión y en "session-expired" el hash se
 *   limpia con replace.
 * Las pantallas son los componentes legacy; reciben user y
 * onProfileUpdated igual que antes y se remontan al cambiar de ruta.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Login from "./features/auth/Login";
import { useHashRoute } from "./hooks/useHashRoute";
import {
  defaultRouteFor,
  navigationForRole,
  routeForPath,
  rutaSoloDev,
} from "./config/routing";
import { setAccessToken } from "./services/api";
import AppShell from "./components/AppShell";
import "./styles/users-ui.css";

export default function App() {
  const [user, setUser] = useState(null);
  const { path, navigate } = useHashRoute();

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    navigate("/", null, { replace: true });
  }, [navigate]);

  useEffect(() => {
    window.addEventListener("session-expired", logout);
    return () => window.removeEventListener("session-expired", logout);
  }, [logout]);

  function login(result) {
    setAccessToken(result.access_token);
    setUser(result.user);
  }

  function updateProfile(profile) {
    setUser((current) => current?.id_usuario === profile.id_usuario
      ? { ...current, nombre: profile.nombre, apellido: profile.apellido, email: profile.email, telefono: profile.telefono }
      : current);
  }

  const groups = user ? navigationForRole(user.rol) : [];
  const fallback = user ? defaultRouteFor(user.rol) : null;
  /* Rutas: la normal apunta a ITEMS; #/ui (SOLO DEV) sale de rutaSoloDev y
   * exige rol ADMIN (en producción esa ruta no existe → cae al fallback). */
  const route = routeForPath(path) ?? (rutaSoloDev?.path === path ? rutaSoloDev : null);
  const active = route
    && (route.devOnly ? user?.rol === "ADMIN" : groups.some((group) => group.items.includes(route)))
    ? route
    : null;

  const lastActiveRef = useRef(null);
  useEffect(() => {
    if (active) lastActiveRef.current = active;
  }, [active]);

  /* Hash con ancla de página (no empieza con "#/"): no es ruta → se conserva
   * la última pantalla (el skip link no debe navegar). Si no hay nada que
   * mostrar (hash vacío, "#/desconocida", o ancla tras F5), el efecto de
   * abajo lleva a la pantalla por defecto con replace. */
  const shown = active ?? (window.location.hash.startsWith("#/") ? null : lastActiveRef.current);

  useEffect(() => {
    if (user && fallback && !shown) navigate(fallback.path, null, { replace: true });
  }, [user, fallback, shown, navigate]);

  if (!user) return <Login onLogin={login} />;

  if (!fallback) {
    return <AppShell user={user} groups={[]} activePath={null} onNavigate={() => {}} onLogout={logout}>
      <p>Tu cuenta no tiene pantallas habilitadas.</p>
    </AppShell>;
  }

  if (!shown) return null;

  const Page = shown.component;

  return <AppShell user={user} groups={groups} activePath={shown.path} onNavigate={(target) => navigate(target)} onLogout={logout}>
    <Suspense fallback={<p>Cargando…</p>}>
      <Page key={shown.path} user={user} onProfileUpdated={updateProfile} />
    </Suspense>
  </AppShell>;
}
