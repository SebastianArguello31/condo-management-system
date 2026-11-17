/* Coordina la sesión, las rutas autorizadas y los proveedores compartidos de la interfaz. */
import { Suspense, useCallback, useEffect, useRef, useState,} from "react";

import Login from "./features/auth/Login";
import PasswordRecovery from "./features/auth/PasswordRecovery";
import ChangePasswordForm from "./features/auth/ChangePasswordForm";

import { useHashRoute } from "./hooks/useHashRoute";
import { ConfirmProvider } from "./hooks/useConfirm";

import { defaultRouteFor, navigationForRole, routeForPath, rutaDesdeClavePantalla, rutaSoloDev, } from "./config/routing";

import { api, getAccessToken, setAccessToken, } from "./services/api";
import { routes } from "./services/routes";

import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { Button, ConfirmDialog, ErrorState, ToastProvider, } from "./components/ui";

import "./styles/users-ui.css";

const PROFILE_PATHS = new Set([
  "/mi-perfil",
  "/perfil",
  "/mi-cuenta",
]);

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
  const [loginNotice, setLoginNotice] = useState("");
  const [restoring, setRestoring] = useState(
    () => Boolean(getAccessToken())
  );
  const [restoreError, setRestoreError] = useState("");
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  const lastActiveRef = useRef(null);
  const { path, params, navigate } = useHashRoute();

  const isRecoveryRoute =
    path === "/recuperar-password" ||
    path === "/restablecer-password";

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setRestoring(false);
    setRestoreError("");
    lastActiveRef.current = null;
    navigate("/", null, { replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    setLoginNotice("");
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    function onExpired() {
      clearSession();
      setLoginNotice(
        "Tu sesión expiró o dejó de ser válida. Inicia sesión nuevamente."
      );
    }

    window.addEventListener("session-expired", onExpired);

    return () => {
      window.removeEventListener("session-expired", onExpired);
    };
  }, [clearSession]);

  useEffect(() => {
    if (isRecoveryRoute) return;

    const token = getAccessToken();

    if (!token) {
      setRestoring(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setRestoring(true);
    setRestoreError("");

    api(`${routes.auth}/me`, { signal: controller.signal })
      .then((profile) => {
        if (cancelled || getAccessToken() !== token) return;
        setUser(profile);
      })
      .catch((error) => {
        if (cancelled || error.name === "AbortError") return;
        if (error.status === 401) return;
        if (getAccessToken() !== token) return;

        setRestoreError(
          error.message || "No se pudo verificar la sesión."
        );
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [restoreAttempt, isRecoveryRoute]);

  function login(result) {
    setAccessToken(result.access_token);
    lastActiveRef.current = null;
    setLoginNotice("");
    setRestoreError("");
    setRestoring(false);
    setUser(result.user);
  }

  function updateProfile(profile) {
    setUser((current) =>
      current?.id_usuario === profile.id_usuario
        ? {
            ...current,
            nombre: profile.nombre,
            apellido: profile.apellido,
            email: profile.email,
            telefono: profile.telefono,
          }
        : current
    );
  }

  function completePasswordChange() {
    clearSession();
    setLoginNotice(
      "Tu contraseña fue actualizada. Inicia sesión con la nueva contraseña."
    );
  }

  function openRecovery() {
    setLoginNotice("");
    navigate("/recuperar-password");
  }

  function returnToLogin() {
    setLoginNotice("");
    clearSession();
  }

  const groups = user ? navigationForRole(user.rol) : [];
  const fallback = user ? defaultRouteFor(user.rol) : null;

  const route =
    routeForPath(path) ??
    (rutaSoloDev?.path === path ? rutaSoloDev : null);

  function isAllowed(item) {
    if (!item || !user) return false;
    if (item.devOnly) return user.rol === "ADMIN";

    return groups.some((group) => group.items.includes(item));
  }

  const active = isAllowed(route) ? route : null;
  const previous = lastActiveRef.current;

  const shown =
    active ??
    (
      !window.location.hash.startsWith("#/") &&
      isAllowed(previous)
        ? previous
        : null
    );

  useEffect(() => {
    if (active) lastActiveRef.current = active;
  }, [active]);

  useEffect(() => {
    if (
      !isRecoveryRoute &&
      !restoring &&
      !restoreError &&
      user &&
      fallback &&
      !shown
    ) {
      navigate(fallback.path, null, { replace: true });
    }
  }, [
    isRecoveryRoute,
    restoring,
    restoreError,
    user,
    fallback,
    shown,
    navigate,
  ]);

  function navegarPantalla(clave, queryParams) {
    const target = rutaDesdeClavePantalla(clave, queryParams);
    if (!target) return;

    const targetRoute = routeForPath(target.split("?")[0]);
    if (isAllowed(targetRoute)) navigate(target);
  }

  function volverAlInicio() {
    if (fallback && shown?.path !== fallback.path) {
      navigate(fallback.path);
    }
  }

  if (isRecoveryRoute) {
    return (
      <PasswordRecovery
        key={`${path}:${params.token || ""}`}
        mode={
          path === "/restablecer-password" ? "reset" : "request"
        }
        token={
          typeof params.token === "string" ? params.token : ""
        }
        onBack={returnToLogin}
        onRequestLink={() =>
          navigate("/recuperar-password", null, { replace: true })
        }
        onCompleted={completePasswordChange}
      />
    );
  }

  if (restoring) {
    return (
      <main style={{ padding: "var(--space-6)" }}>
        <p role="status">Restaurando sesión…</p>
      </main>
    );
  }

  if (restoreError) {
    return (
      <main style={{ padding: "var(--space-6)" }}>
        <ErrorState
          title="No se pudo verificar la sesión"
          description={restoreError}
          onRetry={() => {
            setRestoreError("");
            setRestoring(true);
            setRestoreAttempt((current) => current + 1);
          }}
        />

        <Button variant="quiet" onClick={returnToLogin}>
          Volver al inicio de sesión
        </Button>
      </main>
    );
  }

  if (!user) {
    return (
      <Login
        onLogin={login}
        onForgotPassword={openRecovery}
        notice={loginNotice}
      />
    );
  }

  if (!fallback) {
    return (
      <AppShell
        user={user}
        groups={[]}
        activePath={null}
        onNavigate={() => {}}
        onLogout={logout}
      >
        <p>Tu cuenta no tiene pantallas habilitadas.</p>
      </AppShell>
    );
  }

  if (!shown) {
    return <p role="status">Cargando…</p>;
  }

  const Page = shown.component;

  return (
    <AppShell
      user={user}
      groups={groups}
      activePath={shown.path}
      onNavigate={(target) => navigate(target)}
      onLogout={logout}
    >
      <Suspense fallback={<p role="status">Cargando…</p>}>
        <ErrorBoundary
          key={shown.path}
          resetKey={shown.path}
          onVolverInicio={volverAlInicio}
        >
          <Page
            user={user}
            onProfileUpdated={updateProfile}
            onNavigate={navegarPantalla}
          />

          {PROFILE_PATHS.has(shown.path) && (
            <ChangePasswordForm
              onChanged={completePasswordChange}
            />
          )}
        </ErrorBoundary>
      </Suspense>
    </AppShell>
  );
}