# Rutas HTTP para edificios y unidades habitacionales.
# Conecta las solicitudes con los servicios y declara la autenticación y los roles de cada operación.
from flask import Blueprint, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.units import services
from app.modules.units.schemas import (
    BuildingCreateSchema,
    BuildingTypeCreateSchema,
    BuildingTypeUpdateSchema,
    UnitCreateSchema,
    UnitTypeCreateSchema,
    UnitTypeUpdateSchema,
)

units_bp = Blueprint("units", __name__)

@units_bp.get("/building-types")
@token_required
@role_required("ADMIN")
def list_building_types():
    return jsonify(services.list_building_types())

@units_bp.post("/building-types")
@token_required
@role_required("ADMIN")
def create_building_type():
    data = read_json(BuildingTypeCreateSchema())
    return jsonify(services.create_building_type(data)), 201

@units_bp.patch("/building-types/<int:type_id>")
@token_required
@role_required("ADMIN")
def update_building_type(type_id):
    data = read_json(BuildingTypeUpdateSchema(), partial=True)
    return jsonify(services.update_building_type(type_id, data))

@units_bp.delete("/building-types/<int:type_id>")
@token_required
@role_required("ADMIN")
def delete_building_type(type_id):
    services.delete_building_type(type_id)
    return "", 204

@units_bp.get("/unit-types")
@token_required
@role_required("ADMIN")
def list_unit_types():
    return jsonify(services.list_unit_types())

@units_bp.post("/unit-types")
@token_required
@role_required("ADMIN")
def create_unit_type():
    data = read_json(UnitTypeCreateSchema())
    return jsonify(services.create_unit_type(data)), 201

@units_bp.patch("/unit-types/<int:type_id>")
@token_required
@role_required("ADMIN")
def update_unit_type(type_id):
    data = read_json(UnitTypeUpdateSchema(), partial=True)
    return jsonify(services.update_unit_type(type_id, data))

@units_bp.delete("/unit-types/<int:type_id>")
@token_required
@role_required("ADMIN")
def delete_unit_type(type_id):
    services.delete_unit_type(type_id)
    return "", 204

@units_bp.get("/buildings")
@token_required
@role_required("ADMIN")
def list_buildings():
    return jsonify(services.list_buildings())

@units_bp.get("/buildings/<int:building_id>")
@token_required
@role_required("ADMIN")
def get_building(building_id):
    return jsonify(services.get_building(building_id))

@units_bp.post("/buildings")
@token_required
@role_required("ADMIN")
def create_building():
    data = read_json(BuildingCreateSchema())
    building = services.create_building(data)

    return jsonify(building), 201

@units_bp.patch("/buildings/<int:building_id>")
@token_required
@role_required("ADMIN")
def update_building(building_id):
    data = read_json(BuildingCreateSchema(), partial=True)
    services.update_building(building_id, data)

    return jsonify({"message": "Edificio actualizado"})

@units_bp.delete("/buildings/<int:building_id>")
@token_required
@role_required("ADMIN")
def delete_building(building_id):
    services.delete_building(building_id)

    return "", 204

@units_bp.get("/units")
@token_required
@role_required("ADMIN")
def list_units():
    return jsonify(services.list_units())

@units_bp.get("/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def get_unit(unit_id):
    return jsonify(services.get_unit(unit_id))

@units_bp.post("/units")
@token_required
@role_required("ADMIN")
def create_unit():
    data = read_json(UnitCreateSchema())
    unit = services.create_unit(data)

    return jsonify(unit), 201

@units_bp.patch("/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def update_unit(unit_id):
    data = read_json(UnitCreateSchema(), partial=True)
    services.update_unit(unit_id, data)

    return jsonify({"message": "Unidad actualizada"})

@units_bp.delete("/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def delete_unit(unit_id):
    services.delete_unit(unit_id)

    return "", 204
