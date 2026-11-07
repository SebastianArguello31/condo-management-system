import { useEffect, useRef, useState } from "react";
import { Alert, Button, Field, Input } from "../../components/ui";
import Icon from "../../components/ui/Icon";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { contrasenaNueva, login, validate } from "../../validations";
import "./login.css";

const EMAIL_SCHEMA = { email: login.email };
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export default function PasswordRecovery({
  mode,
  token,
  onBack,
  onRequestLink,
  onCompleted,
}) {
  const resetting = mode === "reset";
  const validToken =
    typeof token === "string" && TOKEN_PATTERN.test(token);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [rejectedToken, setRejectedToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const panelRef = useRef(null);
  const feedbackRef = useRef(null);
  const requestRef = useRef(null);

  const invalidLink = resetting && (!validToken || rejectedToken);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (attempt) {
      panelRef.current?.querySelector(".ui-control-invalid")?.focus();
    }
  }, [attempt]);

  useEffect(() => {
    if (error || sent || invalidLink) {
      feedbackRef.current?.focus();
    }
  }, [error, sent, invalidLink]);

  function update(field, value) {
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    if (field === "confirmation") setConfirmation(value);

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === "password" ? { confirmation: undefined } : {}),
    }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (requestRef.current || invalidLink || sent) return;

    const errors = resetting
      ? validate({ password }, contrasenaNueva)
      : validate({ email }, EMAIL_SCHEMA);

    if (resetting && confirmation !== password) {
      errors.confirmation = "Las contraseñas no coinciden.";
    }

    if (resetting && !confirmation) {
      errors.confirmation = "Confirma tu nueva contraseña.";
    }

    setFieldErrors(errors);
    setError("");

    if (Object.keys(errors).length) {
      setAttempt((current) => current + 1);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);

    try {
      await api(
        `${routes.auth}/${resetting ? "reset-password" : "forgot-password"}`,
        {
          method: "POST",
          signal: controller.signal,
          body: resetting
            ? { token, password }
            : { email: email.trim().toLowerCase() },
        }
      );

      if (controller.signal.aborted) return;

      if (resetting) {
        setPassword("");
        setConfirmation("");
        onCompleted();
      } else {
        setSent(true);
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      if (
        resetting &&
        err.status === 400 &&
        (!err.errors || err.errors.token)
      ) {
        setRejectedToken(true);
        setPassword("");
        setConfirmation("");
      } else if (err.errors) {
        const errors = {};

        for (const [field, messages] of Object.entries(err.errors)) {
          errors[field] = Array.isArray(messages)
            ? messages[0]
            : String(messages);
        }

        setFieldErrors(errors);
        setError(err.message || "Revisa los datos ingresados.");
        setAttempt((current) => current + 1);
      } else {
        setError(
          err.status === 429
            ? "Demasiados intentos. Espera antes de volver a intentarlo."
            : err.message || "No se pudo completar la solicitud."
        );
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
      }

      if (!controller.signal.aborted) {
        setBusy(false);
      }
    }
  }

  return (
    <main className="login-page">
      <section
        ref={panelRef}
        className="login-panel"
        aria-labelledby="recovery-title"
      >
        <p className="login-brand">
          <Icon name="buildings" size={20} />
          <span className="login-kicker">CONDOMINIO</span>
        </p>

        <h1 className="login-title" id="recovery-title">
          {resetting ? "Nueva contraseña" : "Recuperar contraseña"}
        </h1>

        <p className="login-description">
          {resetting
            ? "Elige una nueva contraseña para acceder a tu cuenta."
            : "Ingresa el correo electrónico de tu cuenta."}
        </p>

        <div className="auth-recovery-content">
          {(error || sent || invalidLink) && (
            <div ref={feedbackRef} tabIndex={-1}>
              <Alert tone={sent ? "success" : "danger"}>
                {invalidLink
                  ? "El enlace no es válido, ya fue utilizado o expiró. Solicita uno nuevo."
                  : sent
                    ? "Si existe una cuenta habilitada con ese correo, recibirás un enlace. Revisa también la carpeta de spam."
                    : error}
              </Alert>
            </div>
          )}

          {!sent && !invalidLink && (
            <form
              className="ui-form-stack"
              onSubmit={handleSubmit}
              noValidate
              aria-busy={busy || undefined}
            >
              {resetting ? (
                <>
                  <Field
                    label="Nueva contraseña"
                    required
                    error={fieldErrors.password}
                  >
                    <Input
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      disabled={busy}
                      aria-describedby="password-help"
                      onChange={(event) =>
                        update("password", event.target.value)
                      }
                    />
                  </Field>

                  <p id="password-help" className="auth-password-help">
                    Usa al menos 8 caracteres. 
                  </p>

                  <Field
                    label="Confirmar contraseña"
                    required
                    error={fieldErrors.confirmation}
                  >
                    <Input
                      name="confirmation"
                      type="password"
                      autoComplete="new-password"
                      value={confirmation}
                      disabled={busy}
                      onChange={(event) =>
                        update("confirmation", event.target.value)
                      }
                    />
                  </Field>
                </>
              ) : (
                <Field
                  label="Correo electrónico"
                  required
                  error={fieldErrors.email}
                >
                  <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    disabled={busy}
                    onChange={(event) =>
                      update("email", event.target.value)
                    }
                  />
                </Field>
              )}

              <Button type="submit" block busy={busy}>
                {busy
                  ? "Procesando…"
                  : resetting
                    ? "Guardar nueva contraseña"
                    : "Enviar enlace"}
              </Button>
            </form>
          )}

          {invalidLink && (
            <Button block onClick={onRequestLink}>
              Solicitar otro enlace
            </Button>
          )}

          <Button
            variant="quiet"
            block
            disabled={busy}
            onClick={onBack}
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </section>
    </main>
  );
}