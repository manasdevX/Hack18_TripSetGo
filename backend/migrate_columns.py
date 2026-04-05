from app.database.base import engine
from sqlalchemy import text

with engine.connect() as conn:
    stmts = [
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cover_image TEXT",
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS images JSON",
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS saves_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0",
        "CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, type VARCHAR(50) NOT NULL DEFAULT 'info', reference_id VARCHAR, is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now())",
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)",
    ]
    for s in stmts:
        try:
            conn.execute(text(s))
            print("OK:", s[:60])
        except Exception as e:
            print("ERR:", e)
    conn.commit()
    print("Migration done!")
