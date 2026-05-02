from agents.base_agent import BaseAgent
from orchestrator.state import GraphState
from pydantic import BaseModel, Field
from typing import List, Dict
from services.llm_service import LLMService
from langchain_core.messages import HumanMessage
from prompts.curriculum_planner_prompt import CURRICULUM_PLANNER_PROMPT

class SkillContent(BaseModel):
    skill_name: str = Field(..., description="Name of the skill")
    topics: List[str] = Field(..., description="4 to 6 core topics")
    learning_outcomes: List[str] = Field(..., description="4 measurable learning outcomes")
    pedagogical_stage: int = Field(..., description="The recommended stage for this skill (1, 2, or 3) based on logical dependencies")

class FullCurriculumOutput(BaseModel):
    skills_content: List[SkillContent]
    stage_1_name: str = Field(..., description="A professional title for Stage 1 (e.g., 'Core Foundations')")
    stage_2_name: str = Field(..., description="A professional title for Stage 2 (e.g., 'Advanced Implementation')")
    stage_3_name: str = Field(..., description="A professional title for Stage 3 (e.g., 'Enterprise Architecture')")

class CurriculumPlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.llm_service = LLMService()

    def run(self, state: GraphState) -> GraphState:
        skill_gap = state.skill_gap

        if not skill_gap or "skills" not in skill_gap or not skill_gap["skills"]:
            state.curriculum_plan = {"error": "No skills identified for curriculum"}
            state.current_step = "curriculum_error"
            return state

        # 1. Prepare skill data for pedagogical analysis
        experience_level = state.learner_profile["experience_level_category"]
        intensity = state.learner_profile["llm_inferred_profile"]["recommended_learning_intensity"]
        
        skills_to_generate = []
        for skill_data in skill_gap["skills"]:
            skills_to_generate.append({
                "name": skill_data["skill"],
                "current_level": skill_data.get("current_level", 0),
                "target_level": skill_data["target_level"],
                "gap": skill_data["gap"]
            })

        # 2. Generate content and pedagogical sequencing in one batch
        all_content = self._generate_batch_content(skills_to_generate)
        content_map = {c.skill_name: c for c in all_content.skills_content}
        
        stage_titles = {
            1: all_content.stage_1_name,
            2: all_content.stage_2_name,
            3: all_content.stage_3_name
        }

        # 3. Structure the stages based on pedagogical dependencies
        stages = {1: [], 2: [], 3: []}
        total_weeks = 0

        for s in skills_to_generate:
            name = s["name"]
            content = content_map.get(name)
            
            # Default to stage 2 if not provided by LLM
            stage_idx = content.pedagogical_stage if content and content.pedagogical_stage in [1, 2, 3] else 2
            
            est_weeks = self._estimate_weeks(s["gap"], experience_level, intensity)
            total_weeks += est_weeks
            
            stages[stage_idx].append({
                "skill": name,
                "estimated_weeks": est_weeks,
                "topics": content.topics if content else ["General concepts", "Best practices"],
                "learning_outcomes": content.learning_outcomes if content else ["Understand core principles"]
            })

        structured_stages = []
        for stage_num in [1, 2, 3]:
            if stages[stage_num]:
                # Priority labels kept for API schema consistency but driven by pedagogical order
                priority_label = {1: "high", 2: "medium", 3: "low"}.get(stage_num)
                structured_stages.append({
                    "stage": stage_num,
                    "stage_name": stage_titles.get(stage_num, f"Module {stage_num}"),
                    "focus_priority": priority_label,
                    "skills": stages[stage_num]
                })

        state.curriculum_plan = {
            "learning_stages": structured_stages,
            "total_estimated_duration_weeks": total_weeks
        }
        state.current_step = "curriculum_planning_completed"
        return state

    def _generate_batch_content(self, skills: List[Dict]) -> FullCurriculumOutput:
        skill_list_str = "\n".join([f"- {s['name']} (Current Level: {s['current_level']}, Target Level: {s['target_level']})" for s in skills])
        
        # Injected prompt requirement for stage names
        mandate = "\n\nCRITICAL: You must also generate a unique, professional `stage_name` for each of the 3 stages (1, 2, and 3) that summarizes the theme of the skills assigned to that stage."
        prompt = CURRICULUM_PLANNER_PROMPT.format(skill_list_str=skill_list_str) + mandate

        response = self.llm_service.generate_structured(
            [HumanMessage(content=prompt)],
            FullCurriculumOutput
        )
        return response

    def _estimate_weeks(self, gap: int, experience_level: str, intensity: str) -> int:
        base = {1: 1, 2: 2, 3: 3, 4: 4}.get(gap, 4)
        exp_adj = {"junior": 1, "mid": 0, "senior": -1}.get(experience_level, 0)
        return max(1, base + exp_adj)
