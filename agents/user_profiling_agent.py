from agents.base_agent import BaseAgent
from orchestrator.state import GraphState
from services.llm_service import LLMService
from langchain_core.messages import HumanMessage
import json

from pydantic import BaseModel
from typing import List


class LLMProfileOutput(BaseModel):
    primary_domain: str
    transition_difficulty: str
    recommended_learning_intensity: str
    inferred_strengths: List[str]
    inferred_weaknesses: List[str]
class UserProfilingAgent(BaseAgent):

    def __init__(self):
        super().__init__()
        self.llm_service = LLMService()

    def run(self, state: GraphState) -> GraphState:

        user_input = state.user_input

        # Step 1 — Deterministic logic
        experience_category = self._categorize_experience(
            user_input.experience_years
        )

        # Step 2 — LLM reasoning (structured)
        prompt = f"""
        You are an enterprise AI workforce analyst.

        Based on the following user information:
        Current Role: {user_input.current_role}
        Experience Years: {user_input.experience_years}
        Target Role: {user_input.target_role}
        Learning Goal: {user_input.learning_goal}

        Generate a structured learner profile in JSON format with keys:
        - primary_domain
        - transition_difficulty (low/medium/high)
        - recommended_learning_intensity (low/medium/high)
        - inferred_strengths (list of 3)
        - inferred_weaknesses (list of 3)

        Return ONLY valid JSON.
        """

        response = self.llm_service.generate_structured(
            [HumanMessage(content=prompt)],
            LLMProfileOutput
        )

        llm_profile = response.model_dump()

        state.learner_profile = {
            "current_role": user_input.current_role,
            "experience_years": user_input.experience_years,
            "target_role": user_input.target_role,
            "learning_goal": user_input.learning_goal,
            "experience_level_category": experience_category,
            "llm_inferred_profile": llm_profile
        }

        state.current_step = "user_profile_completed"

        return state

    def _categorize_experience(self, years: float) -> str:
        if years < 2:
            return "junior"
        elif years < 5:
            return "mid"
        else:
            return "senior"