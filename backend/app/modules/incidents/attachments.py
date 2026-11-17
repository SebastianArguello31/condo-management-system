# Prepara y guarda adjuntos con límites de cantidad, tamaño y tipo de archivo.
# Separa el nombre visible del nombre aleatorio utilizado para almacenar el contenido.
from pathlib import Path
from uuid import uuid4

from flask import current_app
from werkzeug.exceptions import BadRequest
from werkzeug.utils import secure_filename

MAX_FILES = 3
MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_VIDEO_BYTES = 25 * 1024 * 1024
ALLOWED_FILE_TYPES = {
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
    ".pdf": ("application/pdf", b"%PDF-"),
    ".mp4": ("video/mp4", None),
    ".mov": ("video/quicktime", None),
}
VIDEO_EXTENSIONS = {".mp4", ".mov"}

def get_upload_directory():
    directory = current_app.config.get("INCIDENT_UPLOAD_DIR")
    if directory:
        return Path(directory).resolve()
    return Path(current_app.instance_path) / "uploads" / "incidents"

def prepare_files(files):
    if len(files) > MAX_FILES:
        raise BadRequest("Puedes adjuntar como máximo 3 archivos")
    return [prepare_file(file) for file in files]

def matches_video_container(content, extension):
    # Valida la cabecera del contenedor; no decodifica el video completo.
    if len(content) < 16 or content[4:8] != b"ftyp":
        return False

    box_size = int.from_bytes(content[:4], "big")
    if box_size < 16 or box_size > len(content):
        return False
    if (box_size - 16) % 4 != 0:
        return False

    major_brand = content[8:12]
    compatible_brands = {
        content[offset:offset + 4]
        for offset in range(16, box_size, 4)
    }
    if extension == ".mov":
        return major_brand == b"qt  "

    mp4_brands = {
        b"isom", b"iso2", b"iso3", b"iso4",
        b"iso5", b"iso6", b"mp41", b"mp42",
        b"avc1", b"M4V ",
    }
    return (
        major_brand != b"qt  "
        and bool(({major_brand} | compatible_brands) & mp4_brands)
    )

def prepare_file(file):
    original_name = secure_filename(file.filename or "")
    if not original_name or len(original_name) > 200:
        raise BadRequest("Nombre de archivo inválido o demasiado largo")

    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_FILE_TYPES:
        raise BadRequest("Solo se permiten archivos JPG, PNG, PDF, MP4 y MOV")

    is_video = extension in VIDEO_EXTENSIONS
    max_bytes = MAX_VIDEO_BYTES if is_video else MAX_FILE_BYTES
    max_mb = max_bytes // (1024 * 1024)

    # Lee un byte adicional para detectar exceso de tamaño sin cargar un archivo arbitrariamente grande.
    content = file.stream.read(max_bytes + 1)
    if not content:
        raise BadRequest("No se permiten archivos vacíos")
    if len(content) > max_bytes:
        raise BadRequest(
            f"Cada {'video' if is_video else 'imagen o PDF'} "
            f"puede pesar como máximo {max_mb} MB"
        )

    # Comprueba la firma inicial del contenido además de la extensión del nombre.
    mime_type, signature = ALLOWED_FILE_TYPES[extension]
    valid_content = (
        matches_video_container(content, extension)
        if is_video
        else content.startswith(signature)
    )
    if not valid_content:
        raise BadRequest(
            f"El contenido de {original_name} no coincide "
            "con su extensión o su formato no es compatible"
        )

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
        # Registra el archivo antes de escribir para poder limpiarlo incluso si falla la escritura.
        created_paths.append(path)
        destination.write(file["content"])

def cleanup_files(paths):
    for path in paths:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            current_app.logger.exception("No se pudo limpiar el adjunto %s", path.name)
