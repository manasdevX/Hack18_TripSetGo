"""
Migration: Create transport_cache and restaurant_cache tables.
Run with: docker exec hack18_tripsetgo-backend-1 python migrate_pipeline_tables.py
"""
from app.database.base import engine
from sqlalchemy import text

stmts = [
    """
    CREATE TABLE IF NOT EXISTS transport_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source VARCHAR(100) NOT NULL,
        destination VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(source, destination)
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_transport_cache_src ON transport_cache(source)",
    "CREATE INDEX IF NOT EXISTS ix_transport_cache_dst ON transport_cache(destination)",
    """
    CREATE TABLE IF NOT EXISTS restaurant_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        destination VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        vibe_tags JSONB,
        price_level SMALLINT,
        rating FLOAT,
        address TEXT,
        text_for_embedding TEXT,
        source VARCHAR(50) DEFAULT 'mock',
        fetched_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_restaurant_cache_dest ON restaurant_cache(destination)",
]

with engine.connect() as conn:
    for s in stmts:
        try:
            conn.execute(text(s))
            print(f"OK: {s.strip()[:60]}")
        except Exception as e:
            print(f"ERR: {e}")
    conn.commit()
    print("Pipeline tables migration done!")
