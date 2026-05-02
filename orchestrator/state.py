from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class UserInput(BaseModel):
    current_role: str = Field(..., description="User's current job role")
    experience_years: float = Field(..., ge=0)
    target_role: str = Field(..., description="Desired target role")
    learning_goal: Optional[str] = Field(None, description="Optional learning objective")
    

class GraphState(BaseModel):
    # ===== User Input =====
    user_id: Optional[str] = None
    user_input: Optional[UserInput] = None
    session_id: Optional[str] = "default_session"

    # ===== Agent Outputs =====
    learner_profile: Optional[Dict[str, Any]] = None
    enterprise_skill_map: Optional[Dict[str, Any]] = None
    skill_gap: Optional[Dict[str, Any]] = None
    curriculum_plan: Optional[Dict[str, Any]] = None
    tutoring_session: Optional[Dict[str, Any]] = None
    assessment_result: Optional[Dict[str, Any]] = None
    feedback_summary: Optional[Dict[str, Any]] = None
    tutor_session: Optional[Dict[str, Any]] = None
    knowledge_sources: Optional[List[Any]] = None
    
    # ===== Progress Tracking =====
    current_module_index: int = 0
    current_topic_index: int = 0
    chat_history: List[Dict[str, str]] = []
    completed_topics: List[str] = []
    active_quiz: Optional[Dict[str, Any]] = None # Still used for the current question
    current_quiz_batch: Optional[List[Dict[str, Any]]] = None # Stores the full 10+ question batch
    current_quiz_index: int = 0 # Tracks which question we are on in the batch
    quiz_results: List[bool] = [] # Tracks pass/fail for each question in the batch
    
    # New tracking fields for enforcement
    quiz_scores: List[float] = [] # Track scores for the current module
    module_attempts: int = 0
    needs_review: bool = False
    last_feedback: Optional[str] = None
    preferred_pedagogy: Optional[str] = None # Stores synthesized learner feedback for tutor adaptation

    # ===== Control Fields =====
    current_step: Optional[str] = None
    iteration_count: int = 0
    is_completed: bool = False
    