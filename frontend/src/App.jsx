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
import { ConfirmProvider } from "./hooks/useConfirm";
import {
  defaultRouteFor,
  navigationForRole,
  routeForPath,
  rutaDesdeClavePantalla,
  rutaSoloDev,
} from "./config/routing";
import { setAccessToken } from "./services/api";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { ConfirmDialog, ToastProvider } from "./components/ui";
import "./styles/users-ui.css";

/* F2-1a: ToastProvider + ConfirmProvider montados UNA vez en App, arriba de
 * todo (incluye Login): cualquier pantalla puede usar useToast/useConfirm, y
 * ConfirmDialog queda conectado a la promesa compartida. Los modales y
 * confirmaciones legados (window.confirm, {error, notice} a nivel página)
 * no cambian. */
export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <ConfirmDialog />
        <AppRoutes />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function AppRoutes() {
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

  /* Adaptador para las pantallas de otros devs (legado de develop): reciben
   * onNavigate(clave) y navegan por hash a la ruta equivalente de
   * config/routing.js (DashboardPage llama onNavigate("incidents") y
   * ("employees")). AppShell sigue recibiendo su onNavigate por PATH (para el
   * menú); las pantallas reciben ESTA función, igual que el App.jsx de
   * develop se la pasaba a todas. El aterrizaje por rol lo sigue decidiendo
   * defaultRouteFor (config/routing.js); tras login se respeta el hash
   * solicitado si el rol lo permite. */
  function navegarPantalla(clave, params) {
    const ruta = rutaDesdeClavePantalla(clave, params);
    if (ruta) navigate(ruta);
  }

  /* Para el ErrorBoundary: regresar a la pantalla por defecto del rol
   * (defaultRouteFor) cuando una pantalla falla al renderizar. */
  function volverAlInicio() {
    if (fallback && shown?.path !== fallback.path) navigate(fallback.path);
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
      {/* Boundary por pantalla: si su render falla, el shell y el menú siguen
        * vivos. key = ruta → al navegar el boundary se renueva (limpio). */}
      <ErrorBoundary key={shown.path} resetKey={shown.path} onVolverInicio={volverAlInicio}>
        <Page user={user} onProfileUpdated={updateProfile} onNavigate={navegarPantalla} />
      </ErrorBoundary>
    </Suspense>
  </AppShell>;
}
