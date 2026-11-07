import sys
from getpass import getpass
from pathlib import Path
from marshmallow import ValidationError
from psycopg2 import Error as DatabaseError
from werkzeug.exceptions import HTTPException

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.core.db_helpers import query
from app.modules.users.schemas.accounts import UserCreateSchema
from app.modules.users.services.admins import create_user

def read_admin_data():
    data = {
        "nombre": input("Nombre: ").strip(),
        "apellido": input("Apellido: ").strip(),
        "email": input("Email: ").strip(),
        "telefono": input("Teléfono: ").strip(),
        "password": getpass("Contraseña: "),
    }

    if data["password"] != getpass("Repite la contraseña: "):
        raise ValueError("Las contraseñas no coinciden")

    return data

def main():
    try:
        app = create_app()

        with app.app_context():
            role = query(
                "SELECT id_rol FROM roles WHERE nombre = %s",
                ("ADMIN",),
            )

            if role is None:
                raise ValueError("Primero debes crear el rol ADMIN")

            data = read_admin_data()
            data["id_rol"] = role["id_rol"]

            validated_data = UserCreateSchema().load(data)
            admin = create_user(**validated_data)

        print(f"Administrador creado: {admin['email']}")

    except ValidationError as error:
        raise SystemExit(f"Datos inválidos: {error.messages}") from None

    except ValueError as error:
        raise SystemExit(str(error)) from None

    except HTTPException as error:
        raise SystemExit(error.description) from None

    except DatabaseError:
        raise SystemExit("No se pudo crear el administrador. Revisa la conexión y el esquema de la base de datos.") from None

if __name__ == "__main__":
    main()