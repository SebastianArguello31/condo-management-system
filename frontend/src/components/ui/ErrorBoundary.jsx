/* Boundary de render por pantalla (F2-3): si una pantalla lanza al render,
 * el resto de la aplicación (shell, menú) sigue vivo. Capture → ErrorState
 * con botón "Volver al inicio" (onVolverInicio → pantalla por defecto del
 * rol). `key`/`resetKey` por ruta en App: al navegar se reinicia el estado.
 * El error queda en console.error (título neutro para el usuario; los
 * detalles únicamente en la consola).
 */
import { Component } from "react";
import Button from "./Button";
import ErrorState from "./ErrorState";
import "./ui.css";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.volverAlInicio = this.volverAlInicio.bind(this);
  }

  /* React llama esto durante el render de la fase de captura: el resultado
   * se convierte la fuente de este nuevo estado de error */
  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  volverAlInicio() {
    this.setState({ error: null }, () => this.props.onVolverInicio?.());
  }

  render() {
    if (this.state.error) {
      return (
        <div>
          <ErrorState
            title="La pantalla no se pudo mostrar"
            description="Ya quedó registrado el problema. Puedes regresar a tu pantalla de inicio e intentar de nuevo."
          />
          <div style={{ marginTop: "var(--space-3)" }}>
            <Button variant="quiet" onClick={this.volverAlInicio}>
              Volver al inicio
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
