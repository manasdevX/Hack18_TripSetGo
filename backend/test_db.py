from app.database.session import engine
from sqlalchemy import text
import uuid
from decimal import Decimal
import json

try:
    with engine.connect() as conn:
        print("Connected...")
        query = text("""
            INSERT INTO expenses (id, group_id, title, description, amount, category, paid_by, split_type, splits, expense_type) 
            VALUES (:id, :group_id, :title, :description, :amount, :category, :paid_by, :split_type, :splits, :expense_type)
        """)
        
        splits_dict = {"97e36215-60a8-484a-a0c3-499529409298": 600.0, "78ad8701-ed7f-465b-9f26-84bca5bc60c0": 600.0}
        
        result = conn.execute(query, {
            "id": "3eab9954-ecbe-4f1f-a149-207a85d232c8",
            "group_id": "39494992-fd3e-413b-a0bc-bc8841bd0981", 
            "title": 'dinner', 
            "description": None, 
            "amount": Decimal('1200'), 
            "category": 'food', 
            "paid_by": "c1735e56-e343-4979-a93c-3cc39f66fe2f", 
            "split_type": 'equal', 
            "splits": json.dumps(splits_dict), 
            "expense_type": 'regular'
        })
        conn.commit()
        print("Raw query success.")
except Exception as e:
    import traceback
    traceback.print_exc()

