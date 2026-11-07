from decimal import Decimal

from werkzeug.exceptions import BadRequest, NotFound

from app.core.db_helpers import transaction
from app.modules.maintenance.repositories import inventory as repo


def list_items(filters):
    with transaction() as cursor:
        return repo.list_items(
            search=filters.get("buscar"),
            category=filters.get("categoria"),
            low_stock=filters.get("bajo_stock", False),
            active=filters.get("activo"),
            cursor=cursor,
        )


def create_item(data):
    with transaction() as cursor:
        created = repo.insert_item(data, cursor=cursor)
        return repo.get_item(created["id_insumo"], cursor=cursor)


def update_item(item_id, data):
    if not data:
        raise BadRequest("Debes indicar los campos que deseas actualizar")
    with transaction() as cursor:
        if repo.get_item(item_id, cursor=cursor, for_update=True) is None:
            raise NotFound("Insumo no encontrado")
        repo.update_item(item_id, data, cursor=cursor)
        return repo.get_item(item_id, cursor=cursor)


def register_movement(item_id, movement_type, data, actor_id):
    quantity = Decimal(data["cantidad"])
    effective_type = movement_type
    direction = data.get("direccion")
    if movement_type == "AJUSTE":
        effective_type = f"AJUSTE_{direction}"
        delta = quantity if direction == "ENTRADA" else -quantity
    else:
        delta = -quantity if movement_type == "SALIDA" else quantity

    with transaction() as cursor:
        item = repo.get_item(item_id, cursor=cursor, for_update=True)
        if item is None:
            raise NotFound("Insumo no encontrado")
        if not item["activo"]:
            raise BadRequest("No se pueden registrar movimientos para un insumo inactivo")
        if movement_type == "INICIAL":
            if item["stock"] != 0 or repo.has_initial_movement(item_id, cursor=cursor):
                raise BadRequest("Las existencias iniciales ya fueron registradas")

        updated = repo.change_stock(item_id, delta, cursor=cursor)
        if updated is None:
            raise BadRequest("El movimiento dejaría el stock en negativo")
        repo.insert_movement(
            item_id,
            effective_type,
            quantity,
            updated["stock"],
            data["motivo"],
            actor_id,
            cursor=cursor,
        )
        return repo.get_item(item_id, cursor=cursor)


def list_movements(item_id, filters):
    with transaction() as cursor:
        if repo.get_item(item_id, cursor=cursor) is None:
            raise NotFound("Insumo no encontrado")
        return repo.list_movements(
            item_id,
            since=filters.get("desde"),
            until=filters.get("hasta"),
            kind=filters.get("tipo"),
            intervention_id=filters.get("id_intervencion"),
            cursor=cursor,
        )


def list_low_stock():
    return list_items({"bajo_stock": True, "activo": True})
