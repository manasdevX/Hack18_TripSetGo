"""Check which columns exist in the users table in Neon DB."""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv(dotenv_path="/app/.env")
DATABASE_URL = os.environ.get("DATABASE_URL")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Check users columns
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = 'public'
    ORDER BY ordinal_position
""")
rows = cur.fetchall()
print("=== users table columns ===")
for r in rows:
    print(f"  {r[0]}: {r[1]}")

# Check if trips table exists
cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
""")
tables = cur.fetchall()
print("\n=== tables in public schema ===")
for t in tables:
    print(f"  {t[0]}")

cur.close()
conn.close()
