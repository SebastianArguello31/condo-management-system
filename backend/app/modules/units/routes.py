from flask import Blueprint, jsonify
from werkzeug.exceptions import NotFound

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.units.schemas import BuildingCreateSchema, UnitCreateSchema
from app.modules.units import services

units_bp = Blueprint("units", __name__, url_prefix="/condominio")

@units_bp.get("/building-types")
@token_required
@role_required("ADMIN")
def list_building_types():
    return jsonify(services.get_building_types())

@units_bp.get("/unit-types")
@token_required
@role_required("ADMIN")
def list_unit_types():
    return jsonify(services.get_unit_types())

@units_bp.get("/buildings")
@token_required
@role_required("ADMIN")
def list_buildings():
    return jsonify(services.get_all_buildings())

@units_bp.get("/buildings/<int:building_id>")
@token_required
@role_required("ADMIN")
def get_building(building_id):
    building = services.get_building_by_id(building_id)

    if not building:
        raise NotFound("Edificio no encontrado")

    return jsonify(building)

@units_bp.post("/buildings")
@token_required
@role_required("ADMIN")
def register_building():
    data = read_json(BuildingCreateSchema())

    building = services.create_building(
        nombre=data["nombre"],
        direccion=data.get("direccion"),
        id_tipo_edificio=data["id_tipo_edificio"],
    )

    return jsonify(building), 201

@units_bp.patch("/buildings/<int:building_id>")
@token_required
@role_required("ADMIN")
def edit_building(building_id):
    data = read_json(BuildingCreateSchema(), partial=True)

    if not services.update_building(building_id, data):
        raise NotFound("Edificio no encontrado")

    return jsonify({"message": "Edificio actualizado"})

@units_bp.delete("/buildings/<int:building_id>")
@token_required
@role_required("ADMIN")
def remove_building(building_id):
    if not services.delete_building(building_id):
        raise NotFound("Edificio no encontrado")

    return "", 204

@units_bp.get("/units")
@token_required
@role_required("ADMIN")
def list_units():
    return jsonify(services.get_all_units())

@units_bp.get("/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def get_unit(unit_id):
    unit = services.get_unit_by_id(unit_id)

    if not unit:
        raise NotFound("Unidad no encontrada")

    return jsonify(unit)

@units_bp.post("/units")
@token_required
@role_required("ADMIN")
def register_unit():
    data = read_json(UnitCreateSchema())

    unit = services.create_unit(
        codigo=data["codigo"],
        piso=data.get("piso"),
        id_edificio=data["id_edificio"],
        id_tipo_unidad=data["id_tipo_unidad"],
    )

    return jsonify(unit), 201

@units_bp.patch("/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def edit_unit(unit_id):
    data = read_json(UnitCreateSchema(), partial=True)

    if not services.update_unit(unit_id, data):
        raise NotFound("Unidad no encontrada")

    return jsonify({"message": "Unidad actualizada"})

@units_bp.delete("/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def remove_unit(unit_id):
    if not services.delete_unit(unit_id):
        raise NotFound("Unidad no encontrada")

    return "", 204