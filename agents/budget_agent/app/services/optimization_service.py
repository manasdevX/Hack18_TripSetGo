import json
import logging
from typing import List

from app.core.config import get_settings
from app.core.llm import LLMWrapper
from app.schemas.request import BudgetOptimizationRequest
from app.schemas.response import BudgetOptimizationResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class OptimizationService:
    """
    Service for budget optimization.
    Calculates trip cost and suggests optimizations if over budget.
    """

    def __init__(self) -> None:
        self.llm = LLMWrapper()

    async def optimize(self, request: BudgetOptimizationRequest) -> BudgetOptimizationResponse:
        """
        Main optimization entry point.
        Calculates total cost and optimizes if needed.
        """
        # 1. Calculate total cost
        total_cost = self._calculate_total_cost(request)
        budget_delta = request.total_user_budget - total_cost
        cost_per_person = total_cost / request.travellers if request.travellers > 0 else total_cost

        # 2. Check if within budget
        if total_cost <= request.total_user_budget:
            return BudgetOptimizationResponse(
                status="within_budget",
                total_cost=total_cost,
                cost_per_person=cost_per_person,
                budget_delta=budget_delta,
                adjustments=[],
                optimization_summary=f"Great news! Your trip is within budget. "
                                     f"You have ₹{budget_delta:.2f} remaining. (₹{cost_per_person:.2f} per person)"
            )

        # 3. Over budget - call LLM for optimization suggestions
        excess_cost = total_cost - request.total_user_budget
        adjustments = await self._generate_optimizations(request, total_cost, excess_cost)

        return BudgetOptimizationResponse(
            status="exceeded",
            total_cost=total_cost,
            cost_per_person=cost_per_person,
            budget_delta=budget_delta,
            adjustments=adjustments,
            optimization_summary=f"Your trip exceeds budget by ₹{excess_cost:.2f} (₹{cost_per_person:.2f} per person). "
                                f"We suggest the following cost-saving measures: {'; '.join(adjustments)}"
        )

    def _calculate_total_cost(self, request: BudgetOptimizationRequest) -> float:
        """
        Calculate total trip cost.
        Total = transport + (stay per night * nights) + other costs
        """
        transport_cost = request.selected_transport.price
        stay_cost = (
            request.selected_stay.price_per_night * 
            request.selected_stay.total_nights
        )
        other_costs = request.estimated_other_costs

        total = transport_cost + stay_cost + other_costs
        logger.info(
            "[BUDGET] Cost breakdown - Transport: $%.2f, Stay: $%.2f, Other: $%.2f, Total: $%.2f",
            transport_cost, stay_cost, other_costs, total
        )
        return total

    async def _generate_optimizations(
        self,
        request: BudgetOptimizationRequest,
        total_cost: float,
        excess_cost: float
    ) -> List[str]:
        """
        Use LLM to suggest specific cost-saving measures.
        """
        stay_total = (
            request.selected_stay.price_per_night * 
            request.selected_stay.total_nights
        )

        system_prompt = (
            "You are a Travel Budget Expert. Your task is to suggest specific, "
            "actionable ways to reduce trip costs. Return ONLY a JSON array of strings, "
            "where each string is a concrete suggestion. "
            "Do NOT include markdown, explanations, or anything other than the JSON array."
        )

        user_prompt = (
            f"User Budget: ₹{request.total_user_budget:.2f} (Total for {request.travellers} travellers as a {request.group_type} trip)\n"
            f"Current Plan:\n"
            f"  - Transport ({request.selected_transport.mode}): ₹{request.selected_transport.price:.2f}\n"
            f"  - Stay ({request.selected_stay.category or 'Standard'} - "
            f"{request.selected_stay.total_nights} nights): ₹{stay_total:.2f}\n"
            f"  - Other costs: ₹{request.estimated_other_costs:.2f}\n"
            f"Total Cost: ₹{total_cost:.2f}\n"
            f"Excess Amount to Cut: ₹{excess_cost:.2f}\n"
            f"User Preferences: {request.preferences or 'None specified'}\n\n"
            f"Suggest 3-5 specific ways to reduce costs by at least ₹{excess_cost:.2f} taking the {request.group_type} dynamic into account (e.g. sharing rooms for friends, group discounts). "
            f"Examples: Switch to cheaper accommodation, consider alternative transport, etc."
        )

        try:
            raw_response = await self.llm.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
                max_tokens=500
            )

            adjustments = self._parse_suggestions(raw_response)
            return adjustments

        except Exception as exc:
            logger.error("[BUDGET] LLM optimization failed: %s", exc)
            # Fallback generic suggestions
            return self._generate_fallback_suggestions(request)

    def _parse_suggestions(self, response: str) -> List[str]:
        """
        Parse JSON array of suggestions from LLM.
        Remove markdown code blocks if present.
        """
        cleaned_response = response.strip()

        # Remove markdown code blocks if present
        if cleaned_response.startswith("```"):
            first_newline = cleaned_response.find("\n")
            if first_newline != -1:
                cleaned_response = cleaned_response[first_newline + 1:]

            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]

        cleaned_response = cleaned_response.strip()

        # Parse JSON array
        suggestions = json.loads(cleaned_response)
        if isinstance(suggestions, list):
            return [str(s).strip() for s in suggestions]
        else:
            logger.warning("[BUDGET] LLM returned non-list suggestions")
            return [str(suggestions)]

    def _generate_fallback_suggestions(self, request: BudgetOptimizationRequest) -> List[str]:
        """
        Generate fallback suggestions if LLM fails.
        """
        suggestions = []

        # Suggest cheaper accommodation if stay is significant cost
        stay_percentage = (
            (request.selected_stay.price_per_night * request.selected_stay.total_nights) /
            (request.selected_stay.price_per_night * request.selected_stay.total_nights + 
             request.selected_transport.price + request.estimated_other_costs)
        ) * 100

        if stay_percentage > 40:
            if request.selected_stay.category and "5" in request.selected_stay.category:
                suggestions.append(
                    f"Switch to a 4-star hotel instead of 5-star in {request.selected_stay.location or 'your destination'}"
                )
            elif request.selected_stay.category and "4" in request.selected_stay.category:
                suggestions.append(
                    f"Switch to a 3-star hotel instead of 4-star in {request.selected_stay.location or 'your destination'}"
                )
            else:
                suggestions.append("Consider more budget-friendly accommodation options")

        # Suggest alternative transport if expensive
        if request.selected_transport.price > request.total_user_budget * 0.3:
            suggestions.append(
                f"Consider a more economical {request.selected_transport.mode.lower()} option "
                "or alternative transport method"
            )

        # Suggest reducing other costs
        if request.estimated_other_costs > 0:
            suggestions.append(
                "Plan more free or low-cost activities to reduce daily spending"
            )

        # Generic optimization
        if not suggestions:
            suggestions.append("Consider reducing trip duration or looking for package deals")

        return suggestions
