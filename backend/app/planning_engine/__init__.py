"""
TripSetGo Deterministic Trip Planning Engine
============================================
Complete rule-based, data-driven trip planning — NO LLM.

Architecture:
  Input → Validator → DestinationEngine → TransportEngine → StayEngine
        → ItineraryEngine → BudgetEngine → Optimizer → Output
"""

from .planner import TripPlanner, TripPlanInput, TripPlanResult

__all__ = ["TripPlanner", "TripPlanInput", "TripPlanResult"]
