"""merge heads

Revision ID: 1a435ec31510
Revises: a2aab67b540c, add_derived_columns
Create Date: 2025-05-23 08:37:32.284511

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1a435ec31510'
down_revision = ('a2aab67b540c', 'add_derived_columns')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass