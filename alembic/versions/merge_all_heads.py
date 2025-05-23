"""Merge all heads

Revision ID: merge_all_heads
Revises: 5af1977477ed, add_timestamps
Create Date: 2024-03-21 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'merge_all_heads'
down_revision = ('5af1977477ed', 'add_timestamps')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 