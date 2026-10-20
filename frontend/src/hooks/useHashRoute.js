import { useCallback, useEffect, useMemo, useState } from "react";

/* Router por hash (0 dependencias), sincronizado con location.hash.
 *
 * Reglas de parseo:
 * - Formato esperado: #/ruta?clave=valor&lista=a&lista=b
 * - Hash vacío, "#" o malformado (sin "/" inicial) → path "/" y {} params.
 * - Ruta y query se separan por la PRIMERA "?" (indexOf); el resto queda
 *   intacto dentro de los valores de la query.
 * - decodeURIComponent siempre con try/catch: si el valor está mal
 *   codificado se conserva crudo (nunca rompe el render).
 * - Claves repetidas llegan como array de strings ({ lista: ["a", "b"] }).
 *
 * Puede usarse en varios componentes a la vez: cada uno escucha "hashchange"
 * y mantiene su estado según el hash actual.
 *
 * Ejemplo:
 * const { path, params, navigate } = useHashRoute();
 * // URL: #/incidencias?estado=RECIBIDA&tag=a&tag=b
 * // path === "/incidencias"; params === { estado: "RECIBIDA", tag: ["a", "b"] }
 * navigate("/incidencias", { estado: "RECIBIDA" });
 * navigate("/incidencia", { id: 7 }, { replace: true }); // sin entrada en el historial
 */

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseQuery(query) {
  const params = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
    const key = safeDecode(rawKey);
    const value = safeDecode(rawValue.replaceAll("+", " "));
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      params[key] = Array.isArray(params[key])
        ? [...params[key], value]
        : [params[key], value];
    } else {
      params[key] = value;
    }
  }
  return params;
}

function serializeParams(params) {
  if (!params) return "";
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (key === "") continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null) continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw.startsWith("/")) return { path: "/", params: {} };
  const queryStart = raw.indexOf("?");
  const rawPath = queryStart === -1 ? raw : raw.slice(0, queryStart);
  const rawQuery = queryStart === -1 ? "" : raw.slice(queryStart + 1);
  return {
    path: safeDecode(rawPath) || "/",
    params: parseQuery(rawQuery),
  };
}

export function useHashRoute() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    let active = true;
    function onHashChange() {
      if (active) setRoute(parseHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => {
      active = false;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const navigate = useCallback((path, params, { replace = false } = {}) => {
    const target = `#${path.startsWith("/") ? path : `/${path}`}${serializeParams(params)}`;
    if (replace) {
      window.history.replaceState(null, "", target);
      setRoute(parseHash());
      return;
    }
    if (window.location.hash === target) {
      setRoute(parseHash());
      return;
    }
    window.location.hash = target;
  }, []);

  return useMemo(() => ({ ...route, navigate }), [route, navigate]);
}
