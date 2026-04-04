import os
from dotenv import load_dotenv
import psycopg2
load_dotenv('/app/.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
cols = [r[0] for r in cur.fetchall()]
print("COLUMNS:", cols)
missing = [c for c in ['username','profile_image','bio','followers_count','following_count','subscription_type','subscription_status','subscription_expiry','daily_limit','daily_usage','last_usage_reset'] if c not in cols]
print("MISSING:", missing)
cur.close()
conn.close()
