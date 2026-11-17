"""Agrega tokens de recuperación de contraseña."""

from alembic import op
import sqlalchemy as sa


revision = "s3_004_password_reset"
down_revision = "s3_003_especialidades"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "recuperaciones_password",
        sa.Column(
            "id_recuperacion",
            sa.Integer(),
            sa.Identity(),
            primary_key=True,
        ),
        sa.Column(
            "id_usuario",
            sa.Integer(),
            sa.ForeignKey("usuarios.id_usuario"),
            nullable=False,
        ),
        sa.Column(
            "token_hash",
            sa.String(64),
            nullable=False,
        ),
        sa.Column(
            "creado_en",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "expira_en",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "usado_en",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "token_hash",
            name="uq_recuperaciones_password_token_hash",
        ),
        sa.CheckConstraint(
            "expira_en > creado_en",
            name="ck_recuperaciones_password_expiracion",
        ),
    )

    op.create_index(
        "ix_recuperaciones_password_usuario",
        "recuperaciones_password",
        ["id_usuario"],
    )


def downgrade():
    op.drop_index(
        "ix_recuperaciones_password_usuario",
        table_name="recuperaciones_password",
    )
    op.drop_table("recuperaciones_password")