"""
Migration Script: Add missing columns to Neon DB users table.
Adds subscription + social/discover fields that were added in the User model
but never migrated to the remote Neon database.

Run inside the backend container:
  docker-compose exec backend python migrate_neon.py
"""

import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # fallback: read from .env manually
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
    DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

print(f"Connecting to: {DATABASE_URL[:40]}...")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

migrations = [
    # --- Subscription fields ---
    ("subscription_type",   "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) NOT NULL DEFAULT 'FREE'"),
    ("subscription_status", "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'inactive'"),
    ("subscription_expiry", "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP WITH TIME ZONE"),
    ("daily_limit",         "ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_limit INTEGER NOT NULL DEFAULT 5"),
    ("daily_usage",         "ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_usage INTEGER NOT NULL DEFAULT 0"),
    ("last_usage_reset",    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_usage_reset DATE"),

    # --- Discover / social fields ---
    ("username",            "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)"),
    ("profile_image",       "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500)"),
    ("bio",                 "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(500)"),
    ("followers_count",     "ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0"),
    ("following_count",     "ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0"),

    # --- Social tables ---
    ("trip_likes_table", """
        CREATE TABLE IF NOT EXISTS trip_likes (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            trip_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            PRIMARY KEY (id),
            FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY(trip_id) REFERENCES trips (id) ON DELETE CASCADE
        )
    """),
    ("trip_saves_table", """
        CREATE TABLE IF NOT EXISTS trip_saves (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            trip_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            PRIMARY KEY (id),
            FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY(trip_id) REFERENCES trips (id) ON DELETE CASCADE
        )
    """),
    ("trip_comments_table", """
        CREATE TABLE IF NOT EXISTS trip_comments (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            trip_id UUID NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            PRIMARY KEY (id),
            FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY(trip_id) REFERENCES trips (id) ON DELETE CASCADE
        )
    """),
    ("user_follows_table", """
        CREATE TABLE IF NOT EXISTS user_follows (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            follower_id UUID NOT NULL,
            following_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            PRIMARY KEY (id),
            FOREIGN KEY(follower_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY(following_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """),
]

print("\n--- Running migrations ---")
success = 0
failed = 0
for name, sql in migrations:
    try:
        cur.execute(sql)
        print(f"  ✅  {name}")
        success += 1
    except Exception as e:
        print(f"  ❌  {name}: {e}")
        failed += 1

cur.close()
conn.close()

print(f"\n--- Done: {success} succeeded, {failed} failed ---")
