import json
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from src.state import PlannerState
from src.tools import search_flights, search_hotels, search_local_attractions

def get_llm():
    # Uses OPENAI_API_KEY from environment internally
    return ChatOpenAI(model="gpt-4o-mini", temperature=0)

def supervisor(state: PlannerState) -> dict:
    """Analyzes the prompt and routes to the correct worker by extracting initial inputs."""
    if state.get("destination"):
        # Initial parsing is already done, proceed along the graph loop
        return {"iteration_count": state.get("iteration_count", 0) + 1}
        
    llm = get_llm()
    sys_prompt = """You are a travel supervisor. Extract destination, dates, and budget (as float) from the query. 
    IMPORTANT: Format the date string STRICTLY as YYYY-MM-DD (use current year and an exact start date). 
    Return strictly JSON without markdown blocks: {"destination": "Paris", "dates": "2024-10-01", "budget": 2000.0}"""
    
    msg = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=state["user_query"])
    ])
    
    try:
        content = msg.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return {
            "destination": data.get("destination", "Unknown"),
            "dates": data.get("dates", "Unknown"),
            "budget": float(data.get("budget", 0.0)),
            "iteration_count": 1,
            "current_total_cost": 0.0,
            "booked_flights": {},
            "booked_hotels": {},
            "booked_food": [],
            "daily_itinerary": [],
            "errors": []
        }
    except Exception as e:
        return {"errors": [f"Supervisor failing to parse: {e}"]}

def transport_agent(state: PlannerState) -> dict:
    """Uses both flight and train tools. Updates the state with transport details."""
    llm = get_llm()
    
    # We call our tools concurrently to expand logic bounds
    flight_options = search_flights.invoke({"origin": "Home", "destination": state["destination"], "date": state["dates"]})
    train_options = search_trains.invoke({"origin": "Home", "destination": state["destination"], "date": state["dates"]})
    
    if not flight_options and not train_options:
        return {"errors": ["Real APIs failed to yield any transport options."]}
        
    retry_msg = "We exceeded our budget previously. strictly pick the absolutely cheapest possible option." if any("budget_exceeded" in err for err in state.get("errors", [])) else "Pick the best transport option logically fitting the destination and cost constraint."
    prompt = f"Flight options: {json.dumps(flight_options)}. Train options: {json.dumps(train_options)}. {retry_msg} Return strictly JSON: {{'selected_transport': {{...}}}}."
    
    msg = llm.invoke([HumanMessage(content=prompt)])
    
    try:
        content = msg.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        selected = data.get("selected_transport", {})
        if not selected:
            raise Exception("No specific transport formulated")
        
        cost = float(selected.get("price", 0))    
        return {
            "booked_flights": selected, # Preserving legacy key name for structural state dicts
            "current_total_cost": state.get("current_total_cost", 0.0) + cost
        }
    except Exception as e:
        return {"errors": [f"Transport agent formatting failed: {e} - ensure API returned correct data"]}

def accommodation_agent(state: PlannerState) -> dict:
    """Uses the hotel tool. Updates the state and cost based on typical 3-night stay."""
    llm = get_llm()
    
    # Derive nights from dates or hard code default
    nights = 3 
    options = search_hotels.invoke({"destination": state["destination"], "checkin_date": state["dates"], "nights": nights})
    
    if not options:
         return {"errors": ["Real APIs failed to yield any hotel options."]}
         
    retry_msg = "We need a cheaper hotel to meet our tight budget." if any("budget_exceeded" in err for err in state.get("errors", [])) else "Pick a good balance of cost and quality."
    prompt = f"Hotel options: {json.dumps(options)}. Stay is {nights} nights. Multiply price_per_night by {nights} to get total. {retry_msg} Return strictly JSON: {{'selected_hotel': {{...}}}}."
    
    msg = llm.invoke([HumanMessage(content=prompt)])
    
    try:
        content = msg.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        selected = data.get("selected_hotel", {})
        if not selected:
             raise Exception("LLM returned empty hotel JSON.")
             
        cost = float(selected.get("price_per_night", 0)) * nights
        
        return {
            "booked_hotels": selected,
            "current_total_cost": state["current_total_cost"] + cost
        }
    except Exception as e:
        return {"errors": [f"Hotel Agent failed: {str(e)}"]}

from src.tools import search_flights, search_hotels, search_local_attractions, search_restaurants, search_trains

def experience_agent(state: PlannerState) -> dict:
    """Uses the attraction and restaurant tools to plan daily activities and food."""
    llm = get_llm()
    
    # Fetch data concurrently
    options_attractions = search_local_attractions.invoke({"destination": state["destination"], "preferences": "top attractions"})
    options_restaurants = search_restaurants.invoke({"destination": state["destination"]})
    
    if not options_attractions and not options_restaurants:
        return {"errors": ["Both Attractions and Restaurant live APIs yielded zero data. Ensure destination is valid."]}
        
    prompt = f"Activity options: {json.dumps(options_attractions)}. Food choices: {json.dumps(options_restaurants)}. Select exactly 2 activities and 1 restaurant. Return strictly JSON with two keys: 'daily_itinerary' (list of activities) and 'booked_food' (list of 1 restaurant)."
    msg = llm.invoke([HumanMessage(content=prompt)])
    
    try:
        content = msg.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        acts = data.get("daily_itinerary", [])
        foods = data.get("booked_food", [])
        
        cost_acts = sum(float(item.get("cost", 0)) for item in acts)
        cost_food = sum(float(item.get("price_per_meal", 0)) for item in foods)
        
        return {
            "daily_itinerary": acts,
            "booked_food": foods,
            "current_total_cost": state["current_total_cost"] + cost_acts + cost_food
        }
    except Exception as e:
        return {"errors": [f"Experience agent failed: {str(e)}"]}

def budget_critic_node(state: PlannerState) -> dict:
    """Validates if the current_total_cost exceeds budget. Propagates errors into state if violated."""
    if state["current_total_cost"] > state["budget"]:
        return {
            "errors": ["budget_exceeded"],
            # Reset the cost calculator for when the system loops back
            "current_total_cost": 0.0,
        }
    return {}
