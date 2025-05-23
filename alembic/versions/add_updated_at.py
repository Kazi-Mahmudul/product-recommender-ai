"""add updated_at column

Revision ID: add_updated_at
Revises: add_derived_columns
Create Date: 2024-05-23 08:55:29.674
"""

revision = 'add_updated_at'
down_revision = 'add_derived_columns'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
from datetime import datetime

def upgrade():
    # Column already exists, nothing to do
    pass

def downgrade():
    # Column already exists, nothing to do
    pass 