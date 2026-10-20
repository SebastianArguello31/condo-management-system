/* ==========================================================================
 * TEMPORAL — Arnés de prueba de los hooks (CP2). ELIMINAR EN CP6.
 * No está importado por la aplicación: para montarlo, con `npm run dev`
 * corriendo, ejecutar en la consola del navegador:
 *
 *   await import("/src/dev/hooks-smoke.jsx").then((m) => m.mountHooksSmoke())
 *
 * Aparece un panel abajo a la derecha y cada botón deja trazas en consola
 * con el prefijo "[arnés]". Desmontar: __hooksSmokeUnmount() en consola.
 * ========================================================================== */

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { useHashRoute } from "../hooks/useHashRoute";
import { useQuery } from "../hooks/useQuery";
import { useMutation } from "../hooks/useMutation";
import { ConfirmProvider, useConfirm, useConfirmResponder } from "../hooks/useConfirm";

function log(message) {
  console.log(`[arnés] ${message}`);
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    function abortar() {
      window.clearTimeout(timer);
      reject(new DOMException("Consulta cancelada", "AbortError"));
    }
    if (signal) {
      if (signal.aborted) {
        abortar();
        return;
      }
      signal.addEventListener("abort", abortar, { once: true });
    }
  });
}

const panelStyle = {
  position: "fixed",
  right: 16,
  bottom: 16,
  zIndex: 60,
  width: 400,
  maxHeight: "75vh",
  overflowY: "auto",
  background: "var(--surface)",
  border: "1px solid var(--line-control)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-4)",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--fs-12)",
  lineHeight: "var(--lh-12)",
  color: "var(--ink)",
};

function Btn({ onClick, children, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: danger ? "1px solid var(--accent)" : "1px solid var(--line-control)",
        background: danger ? "var(--status-danger-bg)" : "var(--bg)",
        color: danger ? "var(--status-danger-fg)" : "var(--ink)",
        borderRadius: "var(--radius-sm)",
        padding: "2px 8px",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--fs-12)",
        margin: "2px 6px 2px 0",
      }}
    >
      {children}
    </button>
  );
}

function Titulo({ children }) {
  return (
    <h3
      style={{
        margin: "14px 0 4px",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-13)",
        color: "var(--brand)",
      }}
    >
      {children}
    </h3>
  );
}

function HashSection() {
  const { path, params, navigate } = useHashRoute();

  useEffect(() => {
    log(`hashchange → path="${path}" params=${JSON.stringify(params)}`);
  }, [path, params]);

  return (
    <section>
      <Titulo>useHashRoute</Titulo>
      <p style={{ margin: "0 0 4px" }}>
        path=&quot;{path}&quot; · params={JSON.stringify(params)}
      </p>
      <Btn onClick={() => navigate("/smoke", { estado: "RECIBIDA", tag: ["a", "b"] })}>
        navigate (tag repetido)
      </Btn>
      <Btn onClick={() => navigate("/smoke", { x: "espacio uno" })}>navigate (encode %20)</Btn>
      <Btn onClick={() => { window.location.hash = "#roto"; }}>hash malformado #roto</Btn>
      <Btn onClick={() => { window.location.hash = ""; }}>hash vacío</Btn>
      <Btn onClick={() => { window.location.hash = "#/smoke?m=%E0%A4%A"; }}>
        param %E0%A4%A crudo (decode fallo)
      </Btn>
      <Btn onClick={() => navigate("/smoke?h=a")}>push A (#/smoke?h=a)</Btn>
      <Btn onClick={() => navigate("/smoke?h=b")}>push B (#/smoke?h=b)</Btn>
      <Btn onClick={() => navigate("/smoke?h=c", null, { replace: true })}>
        replace C (sin historia)
      </Btn>
      <Btn onClick={() => { window.location.hash = "#/smoke?x=1?y=2"; }}>
        query con ? extra
      </Btn>
    </section>
  );
}

function HashEspejo() {
  const { path, params } = useHashRoute();

  useEffect(() => {
    log(`espejo (2ª instancia) → path="${path}" params=${JSON.stringify(params)}`);
  }, [path, params]);

  return (
    <p style={{ margin: "0 0 4px", color: "var(--ink-3)" }}>
      espejo 2ª instancia: path=&quot;{path}&quot; · params={JSON.stringify(params)}
    </p>
  );
}

function QuerySection() {
  const [mode, setMode] = useState(0);
  const corridas = useRef(0);
  const { data, loading, error, reload } = useQuery(async (signal) => {
    const etiqueta = mode === 0 ? "lenta-800" : mode === 1 ? "lenta-500" : "rápida-100";
    corridas.current += 1;
    log(`useQuery → INICIA consulta (mode=${mode} ${etiqueta}, corrida=${corridas.current})`);
    await sleep(mode === 0 ? 800 : mode === 1 ? 500 : 100, signal);
    return `respuesta ${etiqueta} (corrida ${corridas.current})`;
  }, [mode]);

  useEffect(() => {
    log(
      `useQuery → data=${JSON.stringify(data)} loading=${loading} error=${String(error && error.message)}`
    );
  }, [data, loading, error]);

  return (
    <section>
      <Titulo>useQuery</Titulo>
      <Btn onClick={() => setMode(0)}>cargar (800 ms)</Btn>
      <Btn onClick={() => reload()}>reload() (conserva data)</Btn>
      <Btn onClick={() => setMode(1)}>cambiar deps (descarta data)</Btn>
      <Btn
        onClick={() => {
          setMode(1);
          window.setTimeout(() => setMode(2), 120);
        }}
      >
        carrera lenta→rápida
      </Btn>
    </section>
  );
}

function QueryEnabledSection() {
  const [enabled, setEnabled] = useState(false);
  const [filtro, setFiltro] = useState("A");
  const { data, loading } = useQuery(async (signal) => {
    log(`useQuery(enabled) → INICIA (filtro=${filtro})`);
    await sleep(250, signal);
    return `resultado ${filtro}`;
  }, [filtro], { enabled });

  useEffect(() => {
    log(`useQuery(enabled) → data=${JSON.stringify(data)} loading=${loading}`);
  }, [data, loading]);

  return (
    <section>
      <Titulo>useQuery enabled=false / cambios de deps</Titulo>
      <Btn onClick={() => setEnabled((v) => !v)}>
        {enabled ? "desactivar" : "activar"} (enabled)
      </Btn>
      <Btn onClick={() => setFiltro((f) => (f === "A" ? "B" : "A"))}>cambiar filtro (deps)</Btn>
    </section>
  );
}

function QueryDesmontable() {
  const { data, loading } = useQuery(async (signal) => {
    log("desmontable → consulta inicia (400 ms)");
    await sleep(400, signal);
    return "tardía";
  }, []);

  useEffect(() => () => log("desmontable → desmontado (abortada, sin setState)"), []);

  useEffect(() => {
    if (!loading && data !== undefined) log(`desmontable → LLEGÓ data "${data}"`);
  }, [data, loading]);

  return <p style={{ margin: "2px 0", color: "var(--ink-3)" }}>consulta desmontable montada</p>;
}

function QueryDesmontableSection() {
  const [montado, setMontado] = useState(false);
  return (
    <section>
      <Titulo>useQuery + desmontaje a mitad de respuesta</Titulo>
      <Btn onClick={() => setMontado(true)}>montar consulta (400 ms)</Btn>
      {montado && (
        <Btn onClick={() => setMontado(false)} danger>
          desmontar YA
        </Btn>
      )}
      {montado && <QueryDesmontable />}
    </section>
  );
}

function MutationSection() {
  const ejecutadas = useRef(0);
  const { run, busy, error, reset } = useMutation(async (payload) => {
    ejecutadas.current += 1;
    await sleep(500);
    if (payload?.fail) {
      const err = new Error("La validación falló");
      err.errors = { nombre: ["El campo es obligatorio"], monto: ["Debe ser mayor a 0"] };
      throw err;
    }
    return `guardado ok (ejecución ${ejecutadas.current})`;
  });

  useEffect(() => {
    if (busy) log("useMutation → busy=true");
  }, [busy]);

  useEffect(() => {
    if (error) {
      log(`useMutation → error estructurado: ${JSON.stringify(error.errors)} ("${error.message}")`);
    }
  }, [error]);

  const ejecutar = async (payload) => {
    try {
      const result = await run(payload);
      log(`useMutation → run ok → ${JSON.stringify(result)}`);
    } catch {
      // el error ya queda logueado por el efecto de error
    }
  };

  const dobleLlamada = () => {
    const primera = run({ fail: true });
    const segunda = run({ fail: true });
    const esLaMisma = primera === segunda;
    log(`useMutation → doble llamada: misma promesa en vuelo=${esLaMisma} (esperado true)`);
    // consume la promesa para evitar unhandled rejection
    void primera.catch(() => {});
  };

  return (
    <section>
      <Titulo>useMutation</Titulo>
      <Btn onClick={() => ejecutar({})}>guardar OK (500 ms)</Btn>
      <Btn onClick={() => ejecutar({ fail: true })} danger>
        guardar con error de campos
      </Btn>
      <Btn onClick={dobleLlamada}>doble llamada simultánea</Btn>
      <Btn onClick={() => reset()}>reset() del error</Btn>
    </section>
  );
}

function ConfirmSection() {
  const confirm = useConfirm();
  const register = useConfirmResponder();
  const [pending, setPending] = useState(null);
  const unregisterRef = useRef(null);

  useEffect(() => {
    unregisterRef.current = register(
      (options) =>
        new Promise((resolve) => {
          setPending({ options, resolve });
        })
    );
    return () => {
      unregisterRef.current?.();
      unregisterRef.current = null;
    };
  }, [register]);

  const responder = (valor) => {
    pending?.resolve(valor);
    setPending(null);
  };

  const probar = async () => {
    const ok = await confirm({
      title: "Eliminar torre",
      message: "La acción es permanente. ¿Seguimos?",
      danger: true,
    });
    log(`useConfirm → resolvió=${ok}`);
  };

  return (
    <section>
      <Titulo>useConfirm + respondedor mínimo (lo real llega en CP4)</Titulo>
      <Btn onClick={probar}>confirm({"{title, message, danger}"})</Btn>
      {pending && (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: 8,
            marginTop: 4,
          }}
        >
          <p style={{ margin: "0 0 6px", color: "var(--ink-2)" }}>
            {pending.options.title}: {pending.options.message}
          </p>
          <Btn onClick={() => responder(true)}>Confirmar</Btn>
          <Btn onClick={() => responder(false)} danger={pending.options.danger}>
            Cancelar
          </Btn>
        </div>
      )}
    </section>
  );
}

function HooksSmoke() {
  return (
    <div style={panelStyle}>
      <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: "var(--fs-13)", fontWeight: 600 }}>
        Arnés de hooks (CP2) — temporal, eliminar en CP6
      </p>
      <p style={{ margin: "2px 0 6px", color: "var(--ink-3)" }}>
        Trazas con prefijo [arnés] en consola
      </p>
      <HashSection />
      <HashEspejo />
      <QuerySection />
      <QueryEnabledSection />
      <QueryDesmontableSection />
      <MutationSection />
      <ConfirmSection />
    </div>
  );
}

let smokeRoot = null;

export function mountHooksSmoke() {
  if (smokeRoot) {
    log("ya está montado");
    return;
  }
  const host = document.createElement("div");
  host.id = "hooks-smoke";
  document.body.appendChild(host);
  smokeRoot = ReactDOM.createRoot(host);
  smokeRoot.render(
    <React.StrictMode>
      <ConfirmProvider>
        <HooksSmoke />
      </ConfirmProvider>
    </React.StrictMode>
  );
  window.__hooksSmokeUnmount = unmountHooksSmoke;
  log("montado — usa los botones del panel; desmóntalo con __hooksSmokeUnmount()");
}

export function unmountHooksSmoke() {
  if (!smokeRoot) return;
  smokeRoot.unmount();
  smokeRoot = null;
  document.getElementById("hooks-smoke")?.remove();
  delete window.__hooksSmokeUnmount;
  log("desmontado");
}
