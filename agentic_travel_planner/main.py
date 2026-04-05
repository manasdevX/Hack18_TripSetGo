import os
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

from fastapi.middleware.cors import CORSMiddleware

# Load Env Vars (e.g. OpenAI Key, RapidAPI Key)
load_dotenv()

from src.graph import compile_graph

app = FastAPI(title="Agentic AI Travel Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile LangGraph during server startup
app_graph = compile_graph()

class PlanRequest(BaseModel):
    query: str

@app.post("/plan")
async def generate_plan(request: PlanRequest):
    # Setup our TypedDict state 
    initial_state = {
        "user_query": request.query,
        "destination": "",
        "dates": "",
        "budget": 0.0,
        "current_total_cost": 0.0,
        "booked_flights": {},
        "booked_hotels": {},
        "booked_food": [],
        "daily_itinerary": [],
        "errors": [],
        "iteration_count": 0
    }
    
    # Execute the LangGraph Supervisor-Worker architecture
    result_state = app_graph.invoke(initial_state)
    
    # Check if system resolved under budget successfully or gracefully bailed out
    budget_adhered = False
    if not (result_state.get("errors") and result_state["errors"][-1] == "budget_exceeded"):
        if result_state["current_total_cost"] <= result_state["budget"]:
            budget_adhered = True
            
    return {
        "status": "success",
        "budget_adhered": budget_adhered,
        "budget": result_state["budget"],
        "total_cost": result_state["current_total_cost"],
        "destination": result_state["destination"],
        "dates": result_state["dates"],
        "booked_flights": result_state["booked_flights"],
        "booked_hotels": result_state["booked_hotels"],
        "booked_food": result_state["booked_food"],
        "daily_itinerary": result_state["daily_itinerary"],
        "iterations": result_state["iteration_count"],
        "errors": result_state["errors"]
    }

if __name__ == "__main__":
    # To run: python main.py
    uvicorn.run(app, host="127.0.0.1", port=8000)
