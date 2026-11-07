from werkzeug.exceptions import NotFound

from app.modules.units.repositories import buildings as buildings_repo
from app.modules.units.repositories import units as units_repo

def list_building_types():
    return buildings_repo.list_types()

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