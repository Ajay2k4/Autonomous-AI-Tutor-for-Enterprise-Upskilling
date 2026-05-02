from agents.base_agent import BaseAgent
from orchestrator.state import GraphState


class SkillGapAgent(BaseAgent):

    def __init__(self):
        super().__init__()

    def run(self, state: GraphState) -> GraphState:

        enterprise_map = state.enterprise_skill_map

        if "error" in enterprise_map:
            state.skill_gap = {"error": "Cannot compute gap due to role error"}
            state.current_step = "skill_gap_error"
            return state

        current_skills = enterprise_map["current_role_skills"]
        target_skills = enterprise_map["target_role_skills"]
        llm_estimated_current = enterprise_map.get("llm_estimated_current")

        gap_results = []
        total_gap_score = 0

        for skill, target_level in target_skills.items():

            if llm_estimated_current and skill in llm_estimated_current:
                current_level = llm_estimated_current[skill]
            else:
                current_level = current_skills.get(skill, 0)
            
            gap = max(target_level - current_level, 0)

            priority = self._assign_priority(gap)

            if gap > 0:
                gap_results.append({
                    "skill": skill,
                    "current_level": current_level,
                    "target_level": target_level,
                    "gap": gap,
                    "priority": priority
                })

            total_gap_score += gap

        state.skill_gap = {
            "total_gap_score": total_gap_score,
            "skills": sorted(
                gap_results,
                key=lambda x: x["gap"],
                reverse=True
            )
        }

        state.current_step = "skill_gap_analysis_completed"

        return state

    def _assign_priority(self, gap: int) -> str:
        if gap == 0:
            return "none"
        elif gap == 1:
            return "low"
        elif gap == 2:
            return "medium"
        else:
            return "high"