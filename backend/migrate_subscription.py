"""
One-time migration script: Add subscription columns + create subscriptions table.
Safe to run multiple times (uses IF NOT EXISTS / IF COLUMN NOT EXISTS pattern).
"""
import sys
sys.path.insert(0, ".")

from app.database.base import engine
from sqlalchemy import text, inspect

def column_exists(conn, table, column):
    result = conn.execute(text(
        f"SELECT column_name FROM information_schema.columns "
        f"WHERE table_name='{table}' AND column_name='{column}'"
    ))
    return result.fetchone() is not None

with engine.connect() as conn:
    print("=== Subscription schema migration ===")

    # --- Add columns to users table ---
    cols = [
        ("subscription_type",   "TEXT DEFAULT 'FREE'"),
        ("subscription_status", "TEXT DEFAULT 'inactive'"),
        ("subscription_expiry", "TIMESTAMP WITH TIME ZONE"),
        ("daily_limit",         "INTEGER DEFAULT 5 NOT NULL"),
        ("daily_usage",         "INTEGER DEFAULT 0 NOT NULL"),
        ("last_usage_reset",    "DATE"),
    ]
    for col_name, col_def in cols:
        if column_exists(conn, "users", col_name):
            print(f"  [skip] users.{col_name} already exists")
        else:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
            print(f"  [added] users.{col_name}")

    # --- Create subscriptions table ---
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            razorpay_payment_id TEXT UNIQUE,
            razorpay_order_id TEXT,
            start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            end_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """))
    print("  [ok] subscriptions table")

    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions(user_id)"
    ))
    print("  [ok] ix_subscriptions_user_id index")

    conn.commit()
    print("=== Migration complete! ===")
