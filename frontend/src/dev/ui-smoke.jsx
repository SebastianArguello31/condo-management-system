/* ==========================================================================
 * TEMPORAL — Arnés de prueba de los componentes ui (CP3). ELIMINAR EN CP6.
 * No está importado por la aplicación: para probarlo, con `npm run dev`
 * corriendo, ejecutar en la consola del navegador:
 *
 *   await import("/src/dev/ui-smoke.jsx").then((m) => m.mountUiSmoke())
 *
 * Abre una capa a pantalla completa con una demo de cada componente; los
 * toasts del ToastProvider del arnés aparecen arriba de la capa. Desmontar
 * con __uiSmokeUnmount() en consola o el botón "Quitar arnés".
 * ========================================================================== */

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  Textarea,
  ToastProvider,
  useToast,
} from "../components/ui";

function logU(message) {
  console.log(`[arnés-ui] ${message}`);
}

const capaStyle = {
  position: "fixed",
  inset: 0,
  zIndex: "var(--z-drawer)",
  overflowY: "auto",
  background: "var(--bg)",
};

const contenidoStyle = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "var(--space-6)",
  fontFamily: "var(--font-ui)",
  color: "var(--ink)",
};

function Section({ titulo, children }) {
  return (
    <section
      style={{
        paddingBlock: "var(--space-5)",
        borderBottom: "1px solid var(--line)",
        display: "grid",
        gap: "var(--space-3)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "var(--fs-16)", color: "var(--brand)" }}>{titulo}</h2>
      {children}
    </section>
  );
}

function Fila({ children }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>{children}</div>;
}

function BotonesSection() {
  const [busy, setBusy] = useState(false);
  return (
    <Section titulo="Button">
      <Fila>
        <Button>Primario</Button>
        <Button variant="quiet">Quiet</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Deshabilitado</Button>
      </Fila>
      <Fila>
        <Button
          busy={busy}
          onClick={() => {
            setBusy(true);
            logU("busy activado (botón bloqueado + spinner inline)");
            window.setTimeout(() => setBusy(false), 1500);
          }}
        >
          {busy ? "Guardando…" : "Probar busy (1,5 s)"}
        </Button>
        <Button variant="quiet" block>
          Block (ancho completo)
        </Button>
      </Fila>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Recorre con Tab: el foco visible es el anillo de 2px (var(--focus-ring)).
      </p>
    </Section>
  );
}

const TONOS = ["neutral", "info", "success", "warning", "danger", "muted"];

function AlertsSection() {
  return (
    <Section titulo="Alert (persistentes)">
      {TONOS.map((tone) => (
        <Alert key={tone} tone={tone} title={`Tono ${tone}`}>
          Texto del aviso con detalle suficiente. {tone === "danger" ? 'role="alert".' : ""}
        </Alert>
      ))}
      <Alert tone="danger" title="Aviso descartable" onDismiss={() => logU("alert cerrado")}>
        Usa la × para cerrarme (se descarta hasta remontar el arnés).
      </Alert>
    </Section>
  );
}

const TONOS_TOAST = ["neutral", "info", "success", "warning", "danger"];

function ToastsSection() {
  const show = useToast();
  return (
    <Section titulo="Toast (efímeros, aria-live=polite)">
      <Fila>
        {TONOS_TOAST.map((tone) => (
          <Button
            key={tone}
            variant={tone === "danger" ? "danger" : "quiet"}
            onClick={() => {
              const id = show(`Toast ${tone}: este aviso se cierra solo.`, { tone });
              logU(`toast id=${id} tone=${tone}`);
            }}
          >
            Toast {tone}
          </Button>
        ))}
      </Fila>
    </Section>
  );
}

function EstadosSection() {
  return (
    <Section titulo="StatusBadge (glifo + texto)">
      <Fila>
        <StatusBadge estado="RECIBIDA" />
        <StatusBadge estado="EN PROCESO" />
        <StatusBadge estado="RESUELTA" />
        <StatusBadge estado="APROBADA" />
        <StatusBadge estado="RECHAZADA" />
        <StatusBadge estado="CANCELADA" />
        <StatusBadge estado="SIN ESTADO" />
        <StatusBadge estado="Custom" tone="warning" glyph="triangle" />
      </Fila>
    </Section>
  );
}

function CamposSection() {
  const [conError, setConError] = useState(false);
  return (
    <Section titulo="Field + controles (aria-invalid / aria-describedby)">
      <Field label="Nombre del espacio" required help="Texto visible que ayuda a comprender el campo.">
        <Input placeholder="Sin error" />
      </Field>
      <Field
        label="Nombre del espacio (con error)"
        error={conError ? "El nombre es obligatorio." : undefined}
      >
        <Input placeholder={conError ? "Con aria-invalid + border accent" : "Sin error"} />
      </Field>
      <Button variant="quiet" onClick={() => setConError((v) => !v)}>
        {conError ? "Quitar error del campo" : "Mostrar error del campo"}
      </Button>
      <Field label="Tipo" help="Elegir de la lista.">
        <Select>
          <option>Salón</option>
          <option>Parrilla</option>
        </Select>
      </Field>
      <Field label="Observaciones">
        <Textarea placeholder="Texto largo…" />
      </Field>
      <Field label="Acepto el reglamento" error="Debe aceptar el reglamento para continuar.">
        <Checkbox />
      </Field>
      <Checkbox label="Checkbox standalone (sin Field)" />
    </Section>
  );
}

function BusquedaSection() {
  const [valor, setValor] = useState("");
  return (
    <Section titulo="SearchInput (Borrar con botón y Esc)">
      <SearchInput
        value={valor}
        onChange={(nuevo) => setValor(nuevo)}
        onClear={() => {
          setValor("");
          logU("searchInput limpiado");
        }}
        placeholder="Buscar unidad…"
      />
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        valor actual: {valor === "" ? "(vacío)" : `"${valor}"`}
      </p>
    </Section>
  );
}

function EstadosVaciosSection() {
  const intentos = useRef(0);
  return (
    <Section titulo="EmptyState / ErrorState / Spinner / Skeleton">
      <EmptyState
        title="Sin reservas todavía"
        description="Cuando un residente reserve, aparecerá aquí."
        action={
          <Button
            variant="quiet"
            onClick={() => {
              intentos.current += 1;
              logU("empty state: acción lanzada");
            }}
          >
            Crear reserva
          </Button>
        }
      />
      <ErrorState
        title="No se pudieron cargar las unidades"
        description="Detalle: falló el servicio (demo)."
        onRetry={() => logU("error state: reintento lanzado")}
      />
      <Fila>
        <Spinner label="Cargando torres…" />
        <Skeleton lines={3} />
      </Fila>
    </Section>
  );
}

function CabezaSection() {
  return (
    <Section titulo="PageHeader">
      <PageHeader
        title="Gestión de reservas"
        meta="12 registros · actualizado 2026-10-20 09:31"
        actions={
          <Button variant="quiet" onClick={() => logU("page header: acción")}>
            Nueva reserva
          </Button>
        }
      />
    </Section>
  );
}

function UiSmoke() {
  useEffect(() => {
    logU("montado — revisa la capa a pantalla completa");
  }, []);

  return (
    <div style={capaStyle}>
      <div style={contenidoStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBlock: "var(--space-4)" }}>
          <strong style={{ fontSize: "var(--fs-13)" }}>
            Arnés de UI (CP3) — temporal, eliminar en CP6
          </strong>
          <Button variant="quiet" onClick={() => window.__uiSmokeUnmount?.()}>
            Quitar arnés
          </Button>
        </div>
        <PageHeader title="Componentes básicos" meta="CP3 · solo tokens" />
        <BotonesSection />
        <AlertsSection />
        <ToastsSection />
        <EstadosSection />
        <CamposSection />
        <BusquedaSection />
        <EstadosVaciosSection />
        <CabezaSection />
      </div>
    </div>
  );
}

let uiRoot = null;

export function mountUiSmoke() {
  if (uiRoot) {
    logU("ya está montado");
    return;
  }
  const host = document.createElement("div");
  host.id = "ui-smoke";
  document.body.appendChild(host);
  uiRoot = ReactDOM.createRoot(host);
  uiRoot.render(
    <React.StrictMode>
      <ToastProvider>
        <UiSmoke />
      </ToastProvider>
    </React.StrictMode>
  );
  window.__uiSmokeUnmount = unmountUiSmoke;
  logU("montado — desmóntalo con __uiSmokeUnmount()");
}

export function unmountUiSmoke() {
  if (!uiRoot) return;
  uiRoot.unmount();
  uiRoot = null;
  document.getElementById("ui-smoke")?.remove();
  delete window.__uiSmokeUnmount;
  logU("desmontado");
}
