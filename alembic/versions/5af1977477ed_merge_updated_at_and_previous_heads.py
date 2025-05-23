"""merge updated_at and previous heads

Revision ID: 5af1977477ed
Revises: 1a435ec31510, add_updated_at
Create Date: 2025-05-23 08:56:39.743479

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5af1977477ed'
down_revision = ('1a435ec31510', 'add_updated_at')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass