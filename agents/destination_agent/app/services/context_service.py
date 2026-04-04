import json
import logging
from typing import Dict, Any

from app.core.config import get_settings
from app.core.llm import LLMWrapper
from app.schemas.request import ContextRequest
from app.schemas.response import ContextResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class ContextService:
    """
    Service for generating destination context via LLM.
    Uses Groq (Llama-3-8b-8192) as primary and Ollama fallback.
    """

    def __init__(self) -> None:
        self.llm = LLMWrapper()

    async def get_context(self, request: ContextRequest) -> ContextResponse:
        """
        Main entry point: fetch destination context from LLM.
        """
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(request)

        try:
            # Call LLM
            raw_response = await self.llm.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.2,
                max_tokens=1000
            )

            # Parse JSON response
            context_data = self._parse_json_response(raw_response)
            
            # Validate and convert to response model
            return ContextResponse(**context_data)

        except json.JSONDecodeError as exc:
            logger.error("[CONTEXT] JSON parsing failed: %s", exc)
            raise ValueError(f"Invalid JSON from LLM: {str(exc)}")
        except Exception as exc:
            logger.error("[CONTEXT] Context generation failed: %s", exc)
            raise

    def _build_system_prompt(self) -> str:
        """
        Build the system prompt for LLM to ensure JSON output.
        """
        return (
            "You are a World-Class Travel Expert. Your task is to provide detailed context "
            "for a trip to a destination during specific dates. "
            "You MUST return a valid JSON object with the following keys:\n"
            "  - destination: string\n"
            "  - areas: list of strings (popular tourist areas)\n"
            "  - top_attractions: list of strings (must-visit specific landmarks, sightseeing spots, or famous places)\n"
            "  - weather_summary: string (likely weather for these dates)\n"
            "  - best_areas_to_stay: list of strings (neighborhoods with a brief 'why')\n"
            "  - travel_advisories: list of strings\n"
            "  - local_tips: string\n\n"
            "DO NOT include any conversational text or markdown blocks. "
            "RETURN ONLY THE JSON."
        )

    def _build_user_prompt(self, request: ContextRequest) -> str:
        """
        Build the user prompt with destination, date, and group context.
        """
        dest = request.destination
        dates = request.dates
        group = request.group_type
        count = request.travellers
        
        prompt = f"Please provide detailed destination context for {dest}"
        if dates:
            prompt += f" during {dates}"
        
        prompt += f". The trip is for {count} people as a {group} trip. "
        prompt += f"Tailor the recommended areas and tips for a {group} dynamic."
        
        return prompt

    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        Parse JSON from LLM response.
        Remove markdown code blocks if present.
        """
        cleaned_response = response.strip()
        
        # Remove markdown code blocks if present
        if cleaned_response.startswith("```"):
            # Find the first newline after the opening ```
            first_newline = cleaned_response.find("\n")
            if first_newline != -1:
                cleaned_response = cleaned_response[first_newline + 1:]
            
            # Remove closing ```
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
        
        cleaned_response = cleaned_response.strip()
        
        # Parse JSON
        return json.loads(cleaned_response)
