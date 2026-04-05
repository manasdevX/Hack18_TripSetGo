import operator
from typing import TypedDict, List, Dict, Any, Annotated

class PlannerState(TypedDict):
    user_query: str
    destination: str
    dates: str
    budget: float
    current_total_cost: float
    booked_flights: Dict[str, Any]
    booked_hotels: Dict[str, Any]
    booked_food: List[Dict[str, Any]]
    daily_itinerary: List[Dict[str, Any]]
    errors: Annotated[List[str], operator.add]
    iteration_count: int
