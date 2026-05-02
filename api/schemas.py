from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from orchestrator.state import GraphState, UserInput

class UserRegistration(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str
    password: str

class ChatMessage(BaseModel):
    state: GraphState
    message: str

class QuizSubmission(BaseModel):
    state: GraphState
    answer: str

class NextTopicRequest(BaseModel):
    state: GraphState

class ProgressUpdate(BaseModel):
    topic: str

class TutorChatInput(BaseModel):
    message: str
    skill: str
    topic: str

class AssessmentSubmission(BaseModel):
    answers: Dict[int, Any] # Map of question ID to user answer (int, list, or str)
    feedback: Optional[str] = None

class AssessmentResponse(BaseModel):
    score: float
    passed: bool
    is_correct_map: Dict[int, bool]
    motivational_feedback: str
    new_pedagogy: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    has_profile: bool
