"""add_permission_to_group_members

Placeholder migration — no schema changes.
This file was a stub and is kept to preserve the migration chain.

Revision ID: b0a9c8d7e6f5
Revises: a1b2c3d4e5f6
Create Date: 2026-04-03

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b0a9c8d7e6f5"
down_revision: Union[str, Sequence[str], None] = "083ed63f9dd2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass  # No-op: placeholder migration


def downgrade() -> None:
    pass  # No-op
