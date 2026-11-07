from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.employees import EmployeeCreateSchema, EmployeeProfileUpdateSchema, EmployeeUpdateSchema

from app.modules.users.schemas.specialties import EmployeeSpecialtySchema
from app.modules.users.services import employees
from app.modules.users.services import specialties
from app.modules.users.services.accounts import delete_account

employees_bp = Blueprint("employees", __name__, url_prefix="/employees")

@employees_bp.get("")
@token_required
@role_required("ADMIN")
def list_employees():
    return jsonify(employees.list_employees())

@employees_bp.post("")
@token_required
@role_required("ADMIN")
def create_employee():
    data = read_json(EmployeeCreateSchema())

    return jsonify(employees.create_employee(data, g.current_user["id_usuario"])), 201

@employees_bp.patch("/<int:user_id>")
@token_required
@role_required("ADMIN")
def update_employee(user_id):
    data = read_json(EmployeeUpdateSchema(), partial=True)

    return jsonify(employees.update_employee(user_id, data, g.current_user["id_usuario"]))

@employees_bp.delete("/<int:user_id>")
@token_required
@role_required("ADMIN")
def delete_employee(user_id):
    delete_account(user_id, g.current_user["id_usuario"], "TECNICO")
    return "", 204

@employees_bp.get("/me")
@token_required
@role_required("TECNICO")
def get_my_profile():
    return jsonify(employees.get_employee_profile(g.current_user["id_usuario"]))

@employees_bp.patch("/me")
@token_required
@role_required("TECNICO")
def update_my_profile():
    data = read_json(EmployeeProfileUpdateSchema(), partial=True)

    return jsonify(employees.update_employee_profile(g.current_user["id_usuario"], data))

@employees_bp.get("/<int:user_id>/specialties")
@token_required
@role_required("ADMIN")
def list_specialties(user_id):
    return jsonify(specialties.list_employee_specialties(user_id))

@employees_bp.post("/<int:user_id>/specialties")
@token_required
@role_required("ADMIN")
def link_specialty(user_id):
    data = read_json(EmployeeSpecialtySchema())

    return jsonify(specialties.link_specialty(
        user_id,
        data["id_especialidad"],
        g.current_user["id_usuario"],
    ))

@employees_bp.delete("/<int:user_id>/specialties/<int:specialty_id>")
@token_required
@role_required("ADMIN")
def unlink_specialty(user_id, specialty_id):
    specialties.unlink_specialty(user_id, specialty_id, g.current_user["id_usuario"])
    return "", 204