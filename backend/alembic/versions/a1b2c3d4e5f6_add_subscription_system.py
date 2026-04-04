"""add_subscription_system

Revision ID: a1b2c3d4e5f6
Revises: 36d9c78bb15e
Create Date: 2026-04-04 00:00:00.000000

Adds:
  - subscription columns to users table
  - subscriptions table
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '36d9c78bb15e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Extend users table with subscription columns ──────────────
    op.add_column('users', sa.Column('subscription_type', sa.String(50), nullable=False, server_default='FREE'))
    op.add_column('users', sa.Column('subscription_status', sa.String(50), nullable=False, server_default='inactive'))
    op.add_column('users', sa.Column('subscription_expiry', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('daily_limit', sa.Integer(), nullable=False, server_default='5'))
    op.add_column('users', sa.Column('daily_usage', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_usage_reset', sa.Date(), nullable=True))

    # ── Create subscriptions table ────────────────────────────────
    op.create_table(
        'subscriptions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('plan_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('razorpay_payment_id', sa.String(255), nullable=True, unique=True),
        sa.Column('razorpay_order_id', sa.String(255), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_subscriptions_user_id', table_name='subscriptions')
    op.drop_table('subscriptions')

    op.drop_column('users', 'last_usage_reset')
    op.drop_column('users', 'daily_usage')
    op.drop_column('users', 'daily_limit')
    op.drop_column('users', 'subscription_expiry')
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'subscription_type')
