from agents.base_agent import BaseAgent
from orchestrator.state import GraphState
from services.ontology_service import OntologyService, RoleNotFoundError
from services.llm_service import LLMService
from prompts.ontology_prompts import ONTOLOGY_FALLBACK_PROMPT
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from typing import Dict


class OntologyFallbackOutput(BaseModel):
    skills: Dict[str, int]
    current_levels: Dict[str, int]

class EnterpriseSkillAgent(BaseAgent):

    def __init__(self):
        super().__init__()
        self.ontology_service = OntologyService()
        self.llm_service = LLMService()

    def run(self, state: GraphState) -> GraphState:

        current_role = state.user_input.current_role
        target_role = state.user_input.target_role
        experience_years = state.user_input.experience_years

        try:
            current_role_skills = self.ontology_service.get_role_skills(current_role)
            target_role_skills = self.ontology_service.get_role_skills(target_role)
            llm_estimated_current = None

        except RoleNotFoundError:
            # Step 2: LLM Fallback with skill weighting
            prompt = ONTOLOGY_FALLBACK_PROMPT.format(
                role_name=target_role,
                current_role=current_role,
                experience_years=experience_years
            )

            response = self.llm_service.generate_structured(
                [HumanMessage(content=prompt)],
                OntologyFallbackOutput
            )

            target_role_skills = response.skills
            llm_estimated_current = response.current_levels
            current_role_skills = {} # We'll rely on LLM estimations in this path

        state.enterprise_skill_map = {
            "current_role": current_role,
            "target_role": target_role,
            "current_role_skills": current_role_skills,
            "target_role_skills": target_role_skills,
            "llm_estimated_current": llm_estimated_current # Pass these along for SkillGapAgent
        }

        state.current_step = "enterprise_skill_mapping_completed"

        return state