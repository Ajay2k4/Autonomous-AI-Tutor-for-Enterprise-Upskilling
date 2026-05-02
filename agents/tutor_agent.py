from concurrent.futures import ThreadPoolExecutor
from agents.base_agent import BaseAgent
from orchestrator.state import GraphState
from services.llm_service import LLMService
from services.knowledge_service import KnowledgeService
from langchain_core.messages import HumanMessage, SystemMessage

class TutorAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.llm_service = LLMService()
        self.knowledge_service = KnowledgeService()

    def run(self, state: GraphState) -> GraphState:
        """
        The node function for LangGraph. 
        Generates the full module lecture and updates the state.
        """
        lecture_content = self.generate_full_module_lecture(state)
        
        # Store in tutor_session for the frontend/next nodes
        state.tutor_session = {
            "lecture_text": lecture_content,
            "module_index": state.current_module_index
        }
        
        return state

    def generate_full_module_lecture(self, state: GraphState) -> str:
        """
        Aggregates skills and topics to generate a master lecture.
        Includes a fallback 'Emergency Mode' if curriculum stages are missing.
        """
        stages = state.curriculum_plan.get("learning_stages", [])
        current_idx = state.current_module_index
        
        # 1. Fallback / Emergency Mode Logic
        # If no stages exist but we have a topic in the session metadata or context
        if not stages:
            # Check if we have a specific topic to teach from the metadata
            fallback_topic = state.tutor_session.get("topic") if state.tutor_session else "General Technical Concepts"
            
            # Use Persona logic even in fallback
            exp_years = state.user_input.experience_years if state.user_input else 0
            persona = self._get_persona(exp_years)
            
            system_prompt = f"""
            You are a Master Technical Educator in 'Direct Instruction' mode.
            {persona}
            TASK: Teach the topic of '{fallback_topic}' comprehensively.
            STRUCTURE: Use professional Markdown with logical headers and code blocks.
            """
            messages = [SystemMessage(content=system_prompt), HumanMessage(content=f"Teach me about {fallback_topic}")]
            response = self.llm_service.generate(messages)
            return response.content if hasattr(response, 'content') else str(response)

        # 2. Standard Flow (Stages Exist)
        if current_idx >= len(stages):
            current_idx = len(stages) - 1

        current_stage = stages[current_idx]
        stage_name = current_stage.get("stage_name", f"Phase {current_stage.get('stage')}")
        all_skills = current_stage.get("skills", [])
        
        # Parallel Retrieval
        module_context_map = []
        def process_skill(skill_data):
            skill_name = skill_data["skill"]
            topics = skill_data.get("topics", [])
            skill_topics_with_context = []
            for topic in topics:
                rag_result = self.knowledge_service.retrieve_with_crag(topic, domain=skill_name)
                skill_topics_with_context.append({"topic": topic, "context": rag_result.get("context", "")})
            return {"skill": skill_name, "topics": skill_topics_with_context}

        with ThreadPoolExecutor(max_workers=5) as executor:
            module_context_map = list(executor.map(process_skill, all_skills))

        exp_years = state.user_input.experience_years if state.user_input else 0
        persona_instruction = self._get_persona(exp_years)

        system_prompt = f"""
        You are a Master Technical Educator.
        Module: {stage_name}
        {persona_instruction}
        TASK: Write a comprehensive Master Lecture for these skills: {module_context_map}
        IMPORTANT: Insert '[NEW_PAGE]' before major shifts in topic.
        Avoid exclamation marks.
        """
        
        messages = [SystemMessage(content=system_prompt), HumanMessage(content="Generate the full technical lecture.")]
        response = self.llm_service.generate(messages)
        content = response.content if hasattr(response, 'content') else str(response)
        return str(content) if content else "Generation failed. Please retry."

    def _get_persona(self, exp_years: float) -> str:
        if exp_years <= 2:
            return "PERSONA: 'The Storyteller'. Use analogies. Comment code. Assume zero base."
        elif exp_years <= 5:
            return "PERSONA: 'The Architect'. Focus on best practices and scalability. Use industry jargon."
        else:
            return "PERSONA: 'The Colleague'. Dense, fast-paced, performance-focused. Skip boilerplate."
