import React from "react";
import ReactDOM from "react-dom/client";

// Fuentes autoalojadas (única dependencia aprobada). Solo pesos usados y
// subconjuntos latin + latin-ext (verificado en node_modules/@fontsource/*).
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-ext-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-ext-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-ext-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-ext-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-ext-500.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/source-serif-4/latin-ext-600.css";

import App from "./App";
import "./index.css";         // CSS legado (solo lectura durante coexistencia)
import "./styles/tokens.css"; // tokens del sistema "Bitácora técnica"
import "./styles/base.css";   // reset/base/utilidades (último para ganar empates)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
