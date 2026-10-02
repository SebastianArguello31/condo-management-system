from marshmallow import ValidationError

def validate_password(value):
    if len(value) < 8:
        raise ValidationError("Debe tener al menos 8 caracteres")
    if len(value.encode("utf-8")) > 72:
        raise ValidationError("No puede superar 72 bytes")
