from decimal import Decimal

from werkzeug.exceptions import BadRequest, Forbidden, NotFound

from app.core.db_helpers import transaction
from app.modules.incidents import services as incident_services
from app.modules.maintenance.repositories import inventory as inventory_repo
from app.modules.maintenance.repositories import interventions as intervention_repo


def _get_intervention_context(intervention_id, user, *, cursor, for_update=False):
    intervention = intervention_repo.get_intervention(
        intervention_id, cursor=cursor, for_update=for_update
    )
    if intervention is None:
        raise NotFound("Intervención no encontrada")
    incident = incident_services.get_incident_context(
        intervention["id_incidencia"], user, for_update=for_update, cursor=cursor
    )
    if user["rol"] == "TECNICO":
        if intervention["id_personal"] != user["id_usuario"]:
            raise Forbidden("Solo puedes consultar o modificar tu intervención")
        if incident["id_personal_asignado"] != user["id_usuario"]:
            raise Forbidden("La incidencia ya no está asignada a tu usuario")
    return intervention, incident


def list_consumptions(intervention_id, user):
    with transaction() as cursor:
        _get_intervention_context(intervention_id, user, cursor=cursor)
        return intervention_repo.list_consumptions(intervention_id, cursor=cursor)


def consume(intervention_id, data, user):
    with transaction() as cursor:
        intervention, incident = _get_intervention_context(
            intervention_id, user, cursor=cursor, for_update=True
        )
        if incident["estado"] not in {"ASIGNADA", "EN_PROCESO", "EN_ESPERA"}:
            raise BadRequest("La incidencia no está en un estado que permita consumir insumos")
        item = inventory_repo.get_item(data["id_insumo"], cursor=cursor, for_update=True)
        if item is None:
            raise NotFound("Insumo no encontrado")
        if not item["activo"]:
            raise BadRequest("El insumo está inactivo")

        quantity = Decimal(data["cantidad"])
        updated = inventory_repo.change_stock(item["id_insumo"], -quantity, cursor=cursor)
        if updated is None:
            raise BadRequest("Stock insuficiente")

        # La restricción única intervención-insumo evita registrar dos veces el mismo descuento.
        inventory_repo.insert_consumption(
            intervention_id,
            item["id_insumo"],
            quantity,
            quantity * Decimal(item["costo_unitario"]),
            user["id_usuario"],
            cursor=cursor,
        )
        inventory_repo.insert_movement(
            item["id_insumo"],
            "SALIDA",
            quantity,
            updated["stock"],
            data["motivo"],
            user["id_usuario"],
            intervention_id=intervention_id,
            cursor=cursor,
        )
        return {
            "id_intervencion": intervention_id,
            "id_insumo": item["id_insumo"],
            "cantidad_utilizada": quantity,
            "stock_resultante": updated["stock"],
        }


def return_consumption(intervention_id, data, user):
    with transaction() as cursor:
        _get_intervention_context(
            intervention_id, user, cursor=cursor, for_update=True
        )
        item = inventory_repo.get_item(data["id_insumo"], cursor=cursor, for_update=True)
        if item is None:
            raise NotFound("Insumo no encontrado")
        quantity = Decimal(data["cantidad"])
        consumed = inventory_repo.intervention_consumed(
            item["id_insumo"], intervention_id, cursor=cursor
        )
        returned = inventory_repo.intervention_returned(
            item["id_insumo"], intervention_id, cursor=cursor
        )
        if quantity > consumed - returned:
            raise BadRequest("La devolución supera el consumo pendiente de devolver")

        updated = inventory_repo.change_stock(
            item["id_insumo"], quantity, cursor=cursor, allow_inactive=True
        )
        if updated is None:
            raise BadRequest("No se pudo actualizar el stock")
        inventory_repo.insert_movement(
            item["id_insumo"],
            "DEVOLUCION",
            quantity,
            updated["stock"],
            data["motivo"],
            user["id_usuario"],
            intervention_id=intervention_id,
            cursor=cursor,
        )
        return {
            "id_intervencion": intervention_id,
            "id_insumo": item["id_insumo"],
            "cantidad_devuelta": quantity,
            "stock_resultante": updated["stock"],
        }
