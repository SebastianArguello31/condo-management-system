"""Agrega versión de sesión para revocar tokens de acceso."""

from alembic import op
import sqlalchemy as sa


revision = "s4_010_session_version"
down_revision = "s4_009_inventario_insumos"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "usuarios",
        sa.Column(
            "session_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.create_check_constraint(
        "ck_usuarios_session_version",
        "usuarios",
        "session_version >= 0",
    )


def downgrade():
    op.drop_constraint(
        "ck_usuarios_session_version",
        "usuarios",
        type_="check",
    )
    op.drop_column("usuarios", "session_version")