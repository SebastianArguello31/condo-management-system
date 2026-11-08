from psycopg2.errors import UniqueViolation
from werkzeug.exceptions import BadRequest, Conflict, NotFound

from app.core.db_helpers import transaction
from app.modules.maintenance.repositories import categories as repo


def list_categories(*, active=None):
    with transaction() as cursor:
        return repo.list_categories(active=active, cursor=cursor)


def create_category(data):
    try:
        with transaction() as cursor:
            return repo.insert_category(data, cursor=cursor)
    except UniqueViolation:
        raise Conflict("Ya existe una categoría de insumo con ese nombre.") from None


def update_category(category_id, data):
    if not data:
        raise BadRequest("Debes indicar los campos que deseas actualizar")

    try:
        with transaction() as cursor:
            category = repo.get_category(category_id, cursor=cursor, for_update=True)
            if category is None:
                raise NotFound("Categoría de insumo no encontrada")

            nombre = data.get("nombre", category["nombre"])
            existing = repo.get_category_by_name(nombre, cursor=cursor)
            if existing and existing["id_categoria_insumo"] != category_id:
                raise Conflict("Ya existe una categoría de insumo con ese nombre.")

            changes = {
                "nombre": nombre,
                "descripcion": data.get("descripcion", category["descripcion"]),
                "activo": data.get("activo", category["activo"]),
            }
            return repo.update_category(
                category_id,
                category["nombre"],
                changes,
                cursor=cursor,
            )
    except UniqueViolation:
        raise Conflict("Ya existe una categoría de insumo con ese nombre.") from None


def delete_category(category_id):
    with transaction() as cursor:
        category = repo.get_category(category_id, cursor=cursor, for_update=True)
        if category is None:
            raise NotFound("Categoría de insumo no encontrada")

        if repo.count_items_by_category(category["nombre"], cursor=cursor):
            raise Conflict(
                "La categoría está asignada a uno o más insumos. "
                "Desactívala para impedir nuevas asignaciones."
            )

        repo.delete_category(category_id, cursor=cursor)
