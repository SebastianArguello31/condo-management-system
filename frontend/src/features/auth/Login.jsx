import { useState } from "react";
import { api } from "../../services/api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      onLogin(result);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-container">
      <form className="card login-form" onSubmit={handleSubmit}>
        <h1>Gestión de condominio</h1>
        <p>Ingresa con tu cuenta asignada.</p>

        {error && <p className="error" role="alert">{error}</p>}

        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button disabled={busy}>
          {busy ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}