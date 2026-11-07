from marshmallow import ValidationError

def validate_password(password):
    if len(password) < 8:
        raise ValidationError("Debe tener al menos 8 caracteres")

    if len(password.encode("utf-8")) > 72:
        raise ValidationError("No puede superar 72 bytes")