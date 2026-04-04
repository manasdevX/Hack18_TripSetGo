from sqlalchemy import create_engine, MetaData, Table, Column, String, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID
from decimal import Decimal
import uuid

engine = create_engine('sqlite:///:memory:', echo=True)
metadata = MetaData()

t = Table('t', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True),
    Column('amount', Numeric(10, 2)),
    Column('splits', JSON)
)
metadata.create_all(engine)

try:
    with engine.begin() as conn:
        conn.execute(t.insert().values(
            id=uuid.uuid4(),
            amount=Decimal('1200'),
            splits={'abc': Decimal('1200')} # Test failing decimal inserts
        ))
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()

