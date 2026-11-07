"""unificar categorias y sesiones

Revision ID: f3499c9b0871
Revises: s4_010_categorias_insumo, s4_010_session_version
Create Date: 2026-11-07 17:38:29.585447

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3499c9b0871'
down_revision: Union[str, Sequence[str], None] = ('s4_010_categorias_insumo', 's4_010_session_version')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
