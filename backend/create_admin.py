from getpass import getpass

from marshmallow import ValidationError

from app import create_app
from app.core.db_helpers import query
from app.modules.users.schemas import UserCreateSchema
from app.modules.users.services import create_user

def main():
    app = create_app()

    with app.app_context():
        role = query(
            "SELECT id_rol FROM roles WHERE nombre = %s;",
            ("ADMIN",),
        )

        if not role:
            raise SystemExit("Primero crea el rol ADMIN")

        data = {
            "nombre": input("Nombre: "),
            "apellido": input("Apellido: "),
            "email": input("Email: "),
            "telefono": input("Teléfono: "),
            "password": getpass("Contraseña: "),
            "id_rol": role["id_rol"],
        }

        if data["password"] != getpass("Repite la contraseña: "):
            raise SystemExit("Las contraseñas no coinciden")

        try:
            data = UserCreateSchema().load(data)
        except ValidationError as error:
            raise SystemExit(str(error.messages))

        user = create_user(**data)
        print(f"Administrador creado: {user['email']}")

if __name__ == "__main__":
    main()