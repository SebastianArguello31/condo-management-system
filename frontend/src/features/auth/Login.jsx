import { useRef, useState } from "react";
import { api } from "../../services/api";
import Icon from "../../components/ui/Icon";
import "./login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api("/auth/login", { method: "POST", body: { email: email.trim(), password } });
      onLogin(result);
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <main className="login-page"><section className="login-card" aria-labelledby="login-title">
    <div className="login-brand" aria-hidden="true"><Icon name="buildings" size={23} /></div>
    <p className="login-kicker">CONDOMINIO</p><h1 id="login-title">Iniciar sesión</h1>
    <p className="login-description">Accede al panel de gestión de tu comunidad.</p>
    <form onSubmit={handleSubmit} aria-busy={busy}>
      {error && <p className="login-error" role="alert">{error}</p>}
      <label htmlFor="login-email"><Icon name="mail" size={16} />Correo electrónico</label>
      <input id="login-email" type="email" name="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@ejemplo.com" required disabled={busy} />
      <label htmlFor="login-password"><Icon name="lock" size={16} />Contraseña</label>
      <input id="login-password" type="password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" required disabled={busy} />
      <button type="submit" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</button>
    </form>
  </section></main>;
}
