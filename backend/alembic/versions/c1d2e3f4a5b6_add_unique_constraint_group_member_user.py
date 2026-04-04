"""add_unique_constraint_group_member_user

Adds a unique constraint on (group_id, user_id) in group_members to prevent
duplicate membership. This is an idempotent migration — safe to run on an
existing Neon database where group_members already exists via create_all().

Revision ID: c1d2e3f4a5b6
Revises: a1b2c3d4e5f6
Create Date: 2026-04-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "b0a9c8d7e6f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    1. Create groups, group_members, expenses, settlements tables if they don't
       exist yet (idempotent — no-ops if create_all() already built them).
    2. Add a partial unique index on (group_id, user_id) WHERE user_id IS NOT NULL
       to prevent a registered user from appearing twice in the same group.
    """
    # Ensure groups table exists (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS groups (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        VARCHAR(255) NOT NULL,
            description TEXT,
            creator_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            currency    VARCHAR(3) NOT NULL DEFAULT 'USD',
            created_at  TIMESTAMPTZ DEFAULT now(),
            updated_at  TIMESTAMPTZ DEFAULT now()
        )
    """)

    # Ensure group_members table exists (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS group_members (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
            name       VARCHAR(255) NOT NULL,
            email      VARCHAR(255),
            joined_at  TIMESTAMPTZ DEFAULT now()
        )
    """)

    # Ensure expenses table exists (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            title        VARCHAR(255) NOT NULL,
            description  TEXT,
            amount       NUMERIC(10, 2) NOT NULL,
            category     VARCHAR(50) NOT NULL DEFAULT 'other',
            paid_by      UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            split_type   VARCHAR(50) NOT NULL DEFAULT 'equal',
            splits       JSONB NOT NULL DEFAULT '{}',
            expense_type VARCHAR(50) NOT NULL DEFAULT 'regular',
            expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_at   TIMESTAMPTZ DEFAULT now(),
            updated_at   TIMESTAMPTZ DEFAULT now()
        )
    """)

    # Ensure settlements table exists (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS settlements (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_id  UUID REFERENCES expenses(id),
            group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            from_member UUID NOT NULL REFERENCES group_members(id),
            to_member   UUID NOT NULL REFERENCES group_members(id),
            amount      NUMERIC(10, 2) NOT NULL,
            method      VARCHAR(50) DEFAULT 'bank-transfer',
            status      VARCHAR(50) DEFAULT 'pending',
            settled_at  TIMESTAMPTZ,
            created_at  TIMESTAMPTZ DEFAULT now()
        )
    """)

    # Partial unique index: one user_id per group (ignore NULLs for guest members)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_group_members_group_user
        ON group_members (group_id, user_id)
        WHERE user_id IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_group_members_group_user")
    # Note: We do NOT drop the tables in downgrade — they contain production data.
    # To fully roll back, destroy and recreate the database.
