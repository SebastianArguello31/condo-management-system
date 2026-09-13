"""Evita vinculos duplicados entre residentes y unidades

Revision ID: c4100e5cff4d
Revises: baseline_001
Create Date: 2026-09-10 15:28:25.024508

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4100e5cff4d'
down_revision: Union[str, Sequence[str], None] = 'baseline_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Si hay duplicados anteriores, detener la migración sin borrar datos.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM residentes
                GROUP BY id_usuario, id_unidad
                HAVING COUNT(*) > 1
            ) THEN
                RAISE EXCEPTION
                    'Existen vinculos duplicados en residentes. Revisarlos antes de continuar.';
            END IF;
        END
        $$;
    """)

    op.create_unique_constraint(
        "uq_residentes_usuario_unidad",
        "residentes",
        ["id_usuario", "id_unidad"],
    )


def downgrade():
    op.drop_constraint(
        "uq_residentes_usuario_unidad",
        "residentes",
        type_="unique",
    )
