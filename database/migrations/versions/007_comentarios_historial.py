"""Conserva los comentarios de avance en el historial de incidencias."""
from alembic import op
import sqlalchemy as sa

revision = "s3_007_comentarios"
down_revision = "s3_006_espacios_politicas"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("historial_incidencia", sa.Column("comentario", sa.String(500), nullable=True))


def downgrade():
    op.drop_column("historial_incidencia", "comentario")
