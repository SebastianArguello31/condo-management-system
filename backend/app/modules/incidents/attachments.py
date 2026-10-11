from pathlib import Path
from uuid import uuid4

from flask import current_app
from werkzeug.exceptions import BadRequest
from werkzeug.utils import secure_filename

MAX_FILES = 3
MAX_FILE_BYTES = 5 * 1024 * 1024
ALLOWED_FILE_TYPES = {
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
    ".pdf": ("application/pdf", b"%PDF-"),
}

def get_upload_directory():
    directory = current_app.config.get("INCIDENT_UPLOAD_DIR")
    if directory:
        return Path(directory).resolve()
    return Path(current_app.instance_path) / "uploads" / "incidents"

def prepare_files(files):
    if len(files) > MAX_FILES:
        raise BadRequest("Puedes adjuntar como máximo 3 archivos")
    return [prepare_file(file) for file in files]

def prepare_file(file):
    original_name = secure_filename(file.filename or "")
    if not original_name or len(original_name) > 200:
        raise BadRequest("Nombre de archivo inválido o demasiado largo")

    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_FILE_TYPES:
        raise BadRequest("Solo se permiten archivos JPG, PNG y PDF")

    content = file.stream.read(MAX_FILE_BYTES + 1)
    if not content:
        raise BadRequest("No se permiten archivos vacíos")
    if len(content) > MAX_FILE_BYTES:
        raise BadRequest("Cada archivo puede pesar como máximo 5 MB")

    mime_type, signature = ALLOWED_FILE_TYPES[extension]
    if not content.startswith(signature):
        raise BadRequest(f"El contenido de {original_name} no coincide con su extensión")

    return {
        "stored_name": f"{uuid4().hex}{extension}",
        "original_name": original_name,
        "mime_type": mime_type,
        "content": content,
    }

def save_file(file, created_paths):
    directory = get_upload_directory()
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / file["stored_name"]

    with path.open("xb") as destination:
        created_paths.append(path)
        destination.write(file["content"])

def cleanup_files(paths):
    for path in paths:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            current_app.logger.exception("No se pudo limpiar el adjunto %s", path.name)