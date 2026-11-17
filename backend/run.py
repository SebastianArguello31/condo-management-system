# Punto de entrada: construye la aplicación Flask para servir la API.
# La ejecución directa inicia el servidor local con el puerto de configuración.
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=app.config["BACKEND_PORT"],
    )