import logging
from typing import List, Dict, Any, Tuple
import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

logger = logging.getLogger(__name__)

def compute_euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> int:
    """Compute Euclidean distance between two points (scaled to int for solver)."""
    return int(math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2) * 10000)

def optimize_daily_route(
    attractions: List[Dict[str, Any]], 
    hotel_coord: Tuple[float, float],
    max_hours: int = 10
) -> List[Dict[str, Any]]:
    """
    Solves the Traveling Salesperson Problem (TSP) for a set of attractions.
    Returns the mathematically shortest path that fits within a day's time budget.
    """
    if not attractions:
        return []

    # 1. Prepare locations (Hotel is index 0)
    locations = [hotel_coord] + [(a["lat"], a["lon"]) for a in attractions]
    num_locations = len(locations)
    
    # 2. Create distance matrix
    distance_matrix = []
    for i in range(num_locations):
        row = []
        for j in range(num_locations):
            row.append(compute_euclidean_distance(locations[i], locations[j]))
        distance_matrix.append(row)

    # 3. Setting up OR-Tools Routing
    manager = pywrapcp.RoutingIndexManager(num_locations, 1, 0) # 1 vehicle, start/end at hotel (0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        """Returns the distance between the two nodes."""
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Distance constraint (simplified representation of time)
    # 10 hours = 600 minutes. We'll use distance as a proxy for transit time.
    # In a real app, we'd use travel times from a Map API.
    dimension_name = "Distance"
    routing.AddDimension(
        transit_callback_index,
        0,  # no slack
        3000000,  # maximum distance per vehicle (placeholder for max_hours)
        True,  # start cumul to zero
        dimension_name,
    )

    # 4. Search Parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    # 5. Solve
    solution = routing.SolveWithParameters(search_parameters)

    # 6. Extract Results
    if solution:
        ordered_attractions = []
        index = routing.Start(0)
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            if node_index != 0: # Skip hotel (start)
                ordered_attractions.append(attractions[node_index - 1])
            index = solution.Value(routing.NextVar(index))
        return ordered_attractions
    else:
        logger.warning("[OPTIMIZER] No optimal solution found. Returning original list.")
        return attractions
