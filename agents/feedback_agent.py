from agents.base_agent import BaseAgent
from orchestrator.state import GraphState
from services.llm_service import LLMService
from langchain_core.messages import HumanMessage

class FeedbackAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.llm_service = LLMService()

    def run(self, state: GraphState) -> GraphState:
        # 1. Generate a motivational summary
        completed = state.completed_topics
        learning_goal = state.user_input.learning_goal if state.user_input else "their career goals"
        
        motivational_prompt = f"""
        You are a motivational technical coach.
        Based on the learner's goal: {learning_goal}
        And their completed topics: {completed}
        
        Generate a brief, professional encouraging feedback message to motivate them for the next topic.
        Avoid exclamation marks.
        """
        
        motivational_response = self.llm_service.generate([HumanMessage(content=motivational_prompt)])
        state.last_feedback = motivational_response.content
        
        # 2. Synthesize pedagogical preferences from history
        # We look at the last few interactions to see if user expressed difficulty or preference
        history_str = "\n".join([f"{m['role']}: {m['content']}" for m in state.chat_history[-10:]])
        
        pedagogy_prompt = f"""
        You are an educational psychologist and technical mentor. 
        Analyze the following recent chat history between a student and a tutor:
        {history_str}
        
        Current pedagogical preference on file: {state.preferred_pedagogy or "None"}
        
        Synthesize a concise (1-sentence) pedagogical profile for this learner. 
        Focus on how they learn best (e.g., 'prefers code examples over theory', 'needs more analogies', 'wants fewer technical jargon terms').
        If the history does not suggest a change, maintain the current profile.
        
        Return ONLY the updated pedagogical profile string. Avoid exclamation marks.
        """
        
        pedagogy_response = self.llm_service.generate([HumanMessage(content=pedagogy_prompt)])
        state.preferred_pedagogy = pedagogy_response.content
        
        state.feedback_summary = {
            "motivational_summary": motivational_response.content,
            "pedagogical_profile": pedagogy_response.content
        }
        return state
