from flask import request
from marshmallow import Schema, fields, pre_load, validate
from werkzeug.exceptions import BadRequest

class BaseSchema(Schema):
    @pre_load
    def trim_strings(self, data, **kwargs):
        if not isinstance(data, dict):
            return data

        return {
            key: (
                value.strip()
                if isinstance(value, str) and key != "password"
                else value
            )
            for key, value in data.items()
        }

def required_text(max_length=150):
    return fields.Str(
        required=True,
        validate=validate.Length(min=1, max=max_length),
    )

def positive_id():
    return fields.Int(
        required=True,
        strict=True,
        validate=validate.Range(min=1),
    )

def read_json(schema, *, partial=False):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        raise BadRequest("Debes enviar un objeto JSON válido")

    if partial and not data:
        raise BadRequest("Debes enviar al menos un campo")

    return schema.load(data, partial=partial)
