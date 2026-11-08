from flask import Blueprint, g, jsonify, request
from werkzeug.exceptions import BadRequest

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.maintenance.schemas import (
    AjusteSchema,
    CategoriaInsumoCreateSchema,
    CategoriaInsumoUpdateSchema,
    ConsumoSchema,
    DevolucionSchema,
    InsumoCreateSchema,
    InsumoUpdateSchema,
    MovimientoSchema,
)
from app.modules.maintenance.services import categories, inventory, interventions


maintenance_bp = Blueprint("maintenance", __name__, url_prefix="/maintenance",)

@maintenance_bp.get("/categories")
@token_required
@role_required("ADMIN", "GESTOR", "TECNICO")
def list_categories():
    only_active = g.current_user["rol"] == "TECNICO"

    return jsonify(
        categories.list_categories(
            active=True if only_active else None
        )
    )

@maintenance_bp.post("/categories")
@token_required
@role_required("ADMIN")
def create_category():
    data = read_json(CategoriaInsumoCreateSchema())
    return jsonify(categories.create_category(data)), 201

@maintenance_bp.patch("/categories/<int:category_id>")
@token_required
@role_required("ADMIN")
def update_category(category_id):
    data = read_json(
        CategoriaInsumoUpdateSchema(),
        partial=True,
    )
    return jsonify(categories.update_category(category_id, data))

@maintenance_bp.delete("/categories/<int:category_id>")
@token_required
@role_required("ADMIN")
def delete_category(category_id):
    categories.delete_category(category_id)
    return "", 204

@maintenance_bp.get("/insumos/bajo-stock")
@token_required
@role_required("ADMIN", "GESTOR", "TECNICO")
def list_low_stock():
    return jsonify(inventory.list_low_stock())

@maintenance_bp.get("/insumos")
@token_required
@role_required("ADMIN", "GESTOR", "TECNICO")
def list_items():
    low_stock = request.args.get("bajo_stock", "false").lower()

    if low_stock not in {"true", "false"}:
        raise BadRequest("bajo_stock debe ser true o false")

    return jsonify(
        inventory.list_items({
            "buscar": request.args.get("buscar"),
            "categoria": request.args.get("categoria"),
            "bajo_stock": low_stock == "true",
            "activo": True,
        })
    )

@maintenance_bp.post("/insumos")
@token_required
@role_required("ADMIN", "GESTOR")
def create_item():
    return jsonify(
        inventory.create_item(
            read_json(InsumoCreateSchema())
        )
    ), 201

@maintenance_bp.patch("/insumos/<int:item_id>")
@token_required
@role_required("ADMIN", "GESTOR")
def update_item(item_id):
    return jsonify(
        inventory.update_item(
            item_id,
            read_json(InsumoUpdateSchema(), partial=True),
        )
    )

@maintenance_bp.post("/insumos/<int:item_id>/existencias-iniciales")
@token_required
@role_required("ADMIN", "GESTOR")
def register_initial_stock(item_id):
    return jsonify(
        inventory.register_movement(
            item_id,
            "INICIAL",
            read_json(MovimientoSchema()),
            g.current_user["id_usuario"],
        )
    )

@maintenance_bp.post("/insumos/<int:item_id>/entradas")
@token_required
@role_required("ADMIN", "GESTOR")
def register_entry(item_id):
    return jsonify(
        inventory.register_movement(
            item_id,
            "ENTRADA",
            read_json(MovimientoSchema()),
            g.current_user["id_usuario"],
        )
    )

@maintenance_bp.post("/insumos/<int:item_id>/salidas")
@token_required
@role_required("ADMIN", "GESTOR")
def register_exit(item_id):
    return jsonify(
        inventory.register_movement(
            item_id,
            "SALIDA",
            read_json(MovimientoSchema()),
            g.current_user["id_usuario"],
        )
    )

@maintenance_bp.post("/insumos/<int:item_id>/ajustes")
@token_required
@role_required("ADMIN", "GESTOR")
def adjust_stock(item_id):
    return jsonify(
        inventory.register_movement(
            item_id,
            "AJUSTE",
            read_json(AjusteSchema()),
            g.current_user["id_usuario"],
        )
    )

@maintenance_bp.get("/insumos/<int:item_id>/movimientos")
@token_required
@role_required("ADMIN", "GESTOR")
def list_movements(item_id):
    return jsonify(
        inventory.list_movements(
            item_id,
            {
                "desde": request.args.get("desde"),
                "hasta": request.args.get("hasta"),
                "tipo": request.args.get("tipo"),
                "id_intervencion": request.args.get(
                    "id_intervencion",
                    type=int,
                ),
            },
        )
    )

@maintenance_bp.get("/intervenciones/<int:intervention_id>/insumos")
@token_required
@role_required("ADMIN", "TECNICO", "RESIDENTE")
def list_intervention_consumptions(intervention_id):
    return jsonify(
        interventions.list_consumptions(
            intervention_id,
            g.current_user,
        )
    )

@maintenance_bp.post("/intervenciones/<int:intervention_id>/insumos")
@token_required
@role_required("ADMIN", "TECNICO")
def consume_for_intervention(intervention_id):
    result = interventions.consume(
        intervention_id,
        read_json(ConsumoSchema()),
        g.current_user,
    )
    return jsonify(result), 201

@maintenance_bp.post("/intervenciones/<int:intervention_id>/devoluciones")
@token_required
@role_required("ADMIN", "TECNICO")
def return_for_intervention(intervention_id):
    return jsonify(
        interventions.return_consumption(
            intervention_id,
            read_json(DevolucionSchema()),
            g.current_user,
        )
    )