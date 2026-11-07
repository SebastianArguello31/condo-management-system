/* Login al kit (F2-9). Contrato INTACTO: ({ onLogin }) y POST
 * ${routes.auth}/login con { email: email.trim(), password }; el result
 * va directo a onLogin(result) — token, sesión y redirección/aterrizaje
 * por rol siguen en App.jsx, y el guard de 401 de api.js no considera al
 * login (ruta excluida). Validación en cliente con el schema `login`
 * (espejo del backend): errores por campo en Field (validate() + err.errors,
 * arrays → primer mensaje) y el resto (401, red) en Alert danger con foco.
 * Etiquetas con glifo a la izquierda: Field acepta label como ReactNode y
 * la variante de alineación va acotada a .login-panel en login.css. */
import { useEffect, useRef, useState } from "react";
import { routes } from "../../services/routes";
import { api } from "../../services/api";
import { useMutation } from "../../hooks";
import { Alert, Button, Field, Input } from "../../components/ui";
import Icon from "../../components/ui/Icon";
import { login, validate } from "../../validations";
import "./login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const panelRef = useRef(null);
  const alertaRef = useRef(null);

  const { run, busy } = useMutation((body) =>
    api(`${routes.auth}/login`, { method: "POST", body })
  );

  /* Foco al PRIMER campo inválido en cada envío fallido (intento solo
   * cambia cuando se setean errores: no roba el foco al escribir). */
  useEffect(() => {
    if (!intento) return;
    panelRef.current?.querySelector(".ui-control-invalid")?.focus();
  }, [intento]);

  /* Foco al error de la acción cuando aparece. */
  useEffect(() => {
    if (error) alertaRef.current?.focus();
  }, [error]);

  function actualizar(campo, valor) {
    if (campo === "email") setEmail(valor);
    else setPassword(valor);
    setFieldErrors((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const errores = validate({ email, password }, login);
    setFieldErrors(errores);
    if (Object.keys(errores).length) {
      setIntento((prev) => prev + 1);
      return;
    }
    try {
      const result = await run({ email: email.trim(), password });
      onLogin(result);
    } catch (err) {
      if (err?.errors && typeof err.errors === "object") {
        const porCampo = {};
        for (const [campo, mensajes] of Object.entries(err.errors)) {
          porCampo[campo] = Array.isArray(mensajes) ? mensajes[0] : String(mensajes);
        }
        setFieldErrors(porCampo);
        setIntento((prev) => prev + 1);
      } else {
        setError(err?.message || "No se pudo iniciar sesión.");
      }
    }
  }

  return (
    <main className="login-page">
      <section ref={panelRef} className="login-panel" aria-labelledby="login-title">
        <p className="login-brand">
          <Icon name="buildings" size={20} />
          <span className="login-kicker">CONDOMINIO</span>
        </p>
        <h1 className="login-title" id="login-title">Iniciar sesión</h1>
        <p className="login-description">Accede al panel de gestión de tu comunidad.</p>
        <form className="ui-form-stack" onSubmit={handleSubmit} noValidate aria-busy={busy || undefined}>
          {error && (
            <div ref={alertaRef} tabIndex={-1}>
              <Alert tone="danger">{error}</Alert>
            </div>
          )}
          <Field
            label={<><Icon name="mail" size={16} /><span>Correo electrónico</span></>}
            required
            error={fieldErrors.email}
          >
            <Input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(event) => actualizar("email", event.target.value)}
            />
          </Field>
          <Field
            label={<><Icon name="lock" size={16} /><span>Contraseña</span></>}
            required
            error={fieldErrors.password}
          >
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(event) => actualizar("password", event.target.value)}
            />
          </Field>
          <div className="ui-form-actions">
            <Button type="submit" block busy={busy}>
              {busy ? "Ingresando…" : "Iniciar sesión"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
