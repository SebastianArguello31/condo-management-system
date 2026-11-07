from psycopg2.errors import ForeignKeyViolation
from werkzeug.exceptions import Conflict, NotFound

from app.modules.units.repositories import buildings as buildings_repo
from app.modules.units.repositories import units as units_repo

def list_building_types():
    return buildings_repo.list_types()

def create_building_type(data):
    return buildings_repo.insert_type(data)

def update_building_type(type_id, data):
    building_type = buildings_repo.update_type(type_id, data)

    if building_type is None:
        raise NotFound("Tipo de edificio no encontrado")

    return building_type

def delete_building_type(type_id):
    try:
        deleted = buildings_repo.delete_type(type_id)
    except ForeignKeyViolation:
        raise Conflict(
            "El tipo de edificio tiene edificios asociados y no se puede eliminar."
        ) from None

    if deleted is None:
        raise NotFound("Tipo de edificio no encontrado")

def list_buildings():
    return buildings_repo.list_buildings()

def get_building(building_id):
    building = buildings_repo.get_building(building_id)

    if building is None:
        raise NotFound("Edificio no encontrado")

    return building

def create_building(data):
    return buildings_repo.insert_building(data)

def update_building(building_id, data):
    building = buildings_repo.update_building(building_id, data)

    if building is None:
        raise NotFound("Edificio no encontrado")

    return building

def delete_building(building_id):
    building = buildings_repo.delete_building(building_id)

    if building is None:
        raise NotFound("Edificio no encontrado")

def list_unit_types():
    return units_repo.list_types()

def create_unit_type(data):
    return units_repo.insert_type(data)

def update_unit_type(type_id, data):
    unit_type = units_repo.update_type(type_id, data)

    if unit_type is None:
        raise NotFound("Tipo de unidad no encontrado")

    return unit_type

def delete_unit_type(type_id):
    try:
        deleted = units_repo.delete_type(type_id)
    except ForeignKeyViolation:
        raise Conflict(
            "El tipo de unidad tiene unidades asociadas y no se puede eliminar."
        ) from None

    if deleted is None:
        raise NotFound("Tipo de unidad no encontrado")

def list_units():
    return units_repo.list_units()

def get_unit(unit_id):
    unit = units_repo.get_unit(unit_id)

    if unit is None:
        raise NotFound("Unidad no encontrada")

    return unit

def create_unit(data):
    return units_repo.insert_unit(data)

def update_unit(unit_id, data):
    unit = units_repo.update_unit(unit_id, data)

    if unit is None:
        raise NotFound("Unidad no encontrada")

    return unit

def delete_unit(unit_id):
    unit = units_repo.delete_unit(unit_id)

    if unit is None:
        raise NotFound("Unidad no encontrada")
