from langgraph.graph import StateGraph, END
from src.state import PlannerState
from src.agents import (
    supervisor, 
    transport_agent, 
    accommodation_agent, 
    experience_agent, 
    budget_critic_node
)

def budget_router(state: PlannerState) -> str:
    """
    Budget Critic routing logic:
    Checks if there was a budget error. If so, routes back to transport agent
    unless we risk an infinite loop.
    """
    # Check if latest validation yielded a budget error
    if state.get("errors") and state["errors"][-1] == "budget_exceeded":
        # Safeguard against infinite loops
        max_iterations = 3
        if state["iteration_count"] >= max_iterations:
            return "end" # Exit graph if we can't meet it after attempts
        
        # Route back to start of planning logic to find cheaper options
        return "transport" 
        
    # Budget is satisfied
    return "end"

def compile_graph():
    # Initialize the graph
    workflow = StateGraph(PlannerState)
    
    # Add nodes representing the agents/workers
    workflow.add_node("supervisor", supervisor)
    workflow.add_node("transport", transport_agent)
    workflow.add_node("accommodation", accommodation_agent)
    workflow.add_node("experience", experience_agent)
    workflow.add_node("budget_critic", budget_critic_node)
    
    # Establish edges (Sequence step by step mapping)
    workflow.set_entry_point("supervisor")
    workflow.add_edge("supervisor", "transport")
    workflow.add_edge("transport", "accommodation")
    workflow.add_edge("accommodation", "experience")
    workflow.add_edge("experience", "budget_critic")
    
    # The conditional edge decides loopback based on the router
    workflow.add_conditional_edges("budget_critic", budget_router, {
        "end": END,
        "transport": "transport"
    })
    
    return workflow.compile()
