from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.employees import EmployeeCreateSchema, EmployeeUpdateSchema, EmployeeProfileUpdateSchema
from app.modules.users.schemas.specialties import EmployeeSpecialtySchema
from app.modules.users.services import employees, specialties
from app.modules.users.services.accounts import delete_account

employee_bp = Blueprint("employees", __name__, url_prefix="/employees")

@employee_bp.get("", strict_slashes=False)
@token_required
@role_required("ADMIN")
def list_employees():
    return jsonify(employees.list_employees())

@employee_bp.post("", strict_slashes=False)
@token_required
@role_required("ADMIN")
def create_employee():
    data = read_json(EmployeeCreateSchema())
    employee = employees.create_employee(data, g.current_user["id_usuario"])
    return jsonify(employee), 201

@employee_bp.patch("/<int:user_id>")
@token_required
@role_required("ADMIN")
def update_employee(user_id):
    data = read_json(EmployeeUpdateSchema(), partial=True)
    employee = employees.update_employee(user_id, data, g.current_user["id_usuario"])
    return jsonify(employee)

@employee_bp.delete("/<int:user_id>")
@token_required
@role_required("ADMIN")
def delete_employee(user_id):
    delete_account(user_id, g.current_user["id_usuario"], "TECNICO")
    return "", 204

@employee_bp.get("/me")
@token_required
@role_required("TECNICO")
def my_profile():
    return jsonify(employees.get_employee_profile(g.current_user["id_usuario"]))

@employee_bp.patch("/me")
@token_required
@role_required("TECNICO")
def update_my_profile():
    data = read_json(EmployeeProfileUpdateSchema(), partial=True)
    employee = employees.update_employee_profile(g.current_user["id_usuario"], data)
    return jsonify(employee)

@employee_bp.get("/<int:user_id>/specialties")
@token_required
@role_required("ADMIN")
def list_specialties(user_id):
    return jsonify(specialties.list_employee_specialties(user_id))

@employee_bp.post("/<int:user_id>/specialties")
@token_required
@role_required("ADMIN")
def assign_specialty(user_id):
    data = read_json(EmployeeSpecialtySchema())
    result = specialties.link_employee_specialty(user_id, data["id_especialidad"])
    return jsonify(result)

@employee_bp.delete("/<int:user_id>/specialties/<int:specialty_id>")
@token_required
@role_required("ADMIN")
def unassign_specialty(user_id, specialty_id):
    specialties.unlink_employee_specialty(user_id, specialty_id)
    return "", 204
