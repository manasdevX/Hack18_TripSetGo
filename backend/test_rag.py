import asyncio
import json
from app.services.planner_service import planner_service

async def main():
    print("Generating Trip Plan for Goa...")
    plan = await planner_service.generate_trip_plan(
        destination="Goa",
        budget=25000,
        days=3,
    )
    
    with open("rag_trip_plan.json", "w") as f:
        json.dump(plan, f, indent=4)
    print("Trip Plan saved to rag_trip_plan.json!")
    
if __name__ == "__main__":
    asyncio.run(main())
