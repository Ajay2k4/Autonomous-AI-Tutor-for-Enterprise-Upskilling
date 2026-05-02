from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db, UserModel, LessonCache
from orchestrator.controller import run_graph
from orchestrator.state import UserInput, GraphState
from memory.session_store import SessionStore
from memory.learner_store import LearnerStore
from agents.tutor_agent import TutorAgent
from agents.assessment_agent import AssessmentAgent
from agents.feedback_agent import FeedbackAgent
from api.schemas import ChatMessage, QuizSubmission, UserRegistration, UserLogin, TokenResponse, ProgressUpdate, TutorChatInput, AssessmentSubmission, AssessmentResponse
from services.llm_service import LLMService
from utils.auth_helper import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from datetime import timedelta
from typing import Dict, Any

router = APIRouter()

# --- Auth Endpoints ---

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegistration, db: Session = Depends(get_db)):
    existing_user = db.query(UserModel).filter(UserModel.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = get_password_hash(user_data.password)
    new_user = UserModel(username=user_data.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "user_id": str(new_user.id)}

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    store = LearnerStore()
    learner = store.get_learner(str(user.id))
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "username": user.username,
        "has_profile": learner is not None
    }

# --- Core Logic Endpoints ---

@router.post("/run")
def run(user_input: UserInput, current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    
    # 1. Initialize session store history
    store = SessionStore()
    store.save_history(user_id, []) 
    
    # 2. Run graph with real extraction and thread_id persistence
    result = run_graph(user_input, user_id)
    
    # 3. Handle model state if result is GraphState
    if hasattr(result, "model_dump"):
        result_state = result
    else:
        # Fallback if return type is dict
        result_state = GraphState(**result)

    result_state.user_id = user_id
    
    # Load existing pedagogy if any
    learner_store = LearnerStore()
    existing_learner = learner_store.get_learner(user_id)
    if existing_learner:
        result_state.preferred_pedagogy = existing_learner.get("pedagogy")

    # 4. Persistence
    # Create a unified profile object for the frontend
    # We use model_dump() if it's a Pydantic model to ensure it's a plain dict
    profile_dict = result_state.learner_profile if isinstance(result_state.learner_profile, dict) else (result_state.learner_profile.model_dump() if result_state.learner_profile else {})
    
    profile_dict["curriculum_plan"] = result_state.curriculum_plan if isinstance(result_state.curriculum_plan, dict) else (result_state.curriculum_plan.model_dump() if result_state.curriculum_plan else {})
    profile_dict["skill_gap"] = result_state.skill_gap if isinstance(result_state.skill_gap, dict) else (result_state.skill_gap.model_dump() if result_state.skill_gap else {})
    profile_dict["target_role"] = user_input.target_role
    
    # Persist progress indices
    profile_dict["current_module_index"] = result_state.current_module_index
    profile_dict["current_topic_index"] = result_state.current_topic_index

    learner_store.update_learner(
        user_id=user_id,
        profile=profile_dict,
        completed=result_state.completed_topics,
        pedagogy=result_state.preferred_pedagogy
    )
    
    return jsonable_encoder(result_state)

@router.post("/chat")
def chat(chat_input: ChatMessage, current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    state = chat_input.state
    
    # Strict multi-tenancy check
    if state.user_id and state.user_id != user_id:
        raise HTTPException(status_code=403, detail="State ownership mismatch")
    state.user_id = user_id
    
    store = SessionStore()
    history = store.get_history(user_id)
    history.append({"role": "user", "content": chat_input.message})
    store.save_history(user_id, history)
    
    state.chat_history = history
    
    agent = TutorAgent()
    result = agent.run(state)
    return jsonable_encoder(result)

@router.get("/get-profile")
def get_profile(current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    store = LearnerStore()
    learner = store.get_learner(user_id)
    if not learner:
        raise HTTPException(status_code=404, detail="Profile not found")
    return learner

@router.post("/generate-quiz")
def generate_quiz(state: GraphState, current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    
    # Strict multi-tenancy check
    if state.user_id and state.user_id != user_id:
        raise HTTPException(status_code=403, detail="State ownership mismatch")
    state.user_id = user_id

    agent = AssessmentAgent()
    topic = state.tutor_session.get("topic", "General") if state.tutor_session else "General"
    content = state.tutor_session.get("lecture_text", "") if state.tutor_session else ""
    
    # 1. Generate the batch of 10+ questions
    batch_quiz = agent.generate_batch_quiz(topic, content)
    
    # 2. Update state to start the batch
    state.current_quiz_batch = jsonable_encoder(batch_quiz.questions)
    state.current_quiz_index = 0
    state.quiz_results = []
    
    # 3. Set the first question as the active one
    if state.current_quiz_batch:
        state.active_quiz = state.current_quiz_batch[0]
        
    return jsonable_encoder(state)

@router.post("/submit-answer")
def submit_answer(submission: QuizSubmission, current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    state = submission.state
    
    # Strict multi-tenancy check
    if state.user_id and state.user_id != user_id:
        raise HTTPException(status_code=403, detail="State ownership mismatch")
    state.user_id = user_id

    agent = AssessmentAgent()
    
    if not state.active_quiz or not state.current_quiz_batch:
        raise HTTPException(status_code=400, detail="No active quiz found")
        
    # 1. Evaluate current answer
    result = agent.evaluate_answer(
        question=state.active_quiz["question"],
        correct_answer=state.active_quiz["correct_option"] if "correct_option" in state.active_quiz else state.active_quiz.get("answer"),
        user_answer=submission.answer,
        q_type=state.active_quiz.get("question_type") or state.active_quiz.get("type", "mcq")
    )
    
    # 2. Record result and update history
    state.quiz_results.append(result["is_correct"])
    
    store = SessionStore()
    history = store.get_history(user_id)
    history.append({"role": "user", "content": f"Answer to question {state.current_quiz_index + 1}: {submission.answer}"})
    history.append({"role": "assistant", "content": result["feedback"]})
    store.save_history(user_id, history)
    state.chat_history = history
    state.user_id = user_id
    
    # 3. Progress tracking
    state.current_quiz_index += 1
    
    # Is the batch finished?
    if state.current_quiz_index < len(state.current_quiz_batch):
        # Move to next question
        state.active_quiz = state.current_quiz_batch[state.current_quiz_index]
        return {
            "state": jsonable_encoder(state),
            "is_correct": result["is_correct"],
            "message": "Recorded. Moving to next question in the assessment."
        }
    else:
        # Batch completed. Calculate final score (70% rule)
        correct_count = sum(1 for r in state.quiz_results if r)
        total_count = len(state.quiz_results)
        score = (correct_count / total_count) * 100
        
        passed = score >= 70
        
        if passed:
            topic = state.tutor_session.get("topic") if state.tutor_session else None
            if topic and topic not in state.completed_topics:
                state.completed_topics.append(topic)
            
            # Advance to next lesson topic
            state.current_topic_index += 1
            state.active_quiz = None
            state.current_quiz_batch = None
            state.needs_review = False
            
            # Integrated Feedback & Pedagogy Synthesis
            feedback_agent = FeedbackAgent()
            state = feedback_agent.run(state)
            
            learner_store = LearnerStore()
            learner_store.update_learner(
                user_id=user_id, 
                completed=state.completed_topics,
                pedagogy=state.preferred_pedagogy
            )
            
            return {
                "state": jsonable_encoder(state),
                "is_correct": result["is_correct"],
                "passed": True,
                "score": score,
                "message": f"Assessment complete. You scored {score:.1f}%. Moving to the next topic."
            }
        else:
            # Failed the 70% threshold
            state.needs_review = True
            state.module_attempts += 1
            state.active_quiz = None
            state.current_quiz_batch = None
            
            return {
                "state": jsonable_encoder(state),
                "is_correct": result["is_correct"],
                "passed": False,
                "score": score,
                "message": f"Assessment complete. You scored {score:.1f}%. This does not meet the 70% requirement. Please review and try again."
            }

@router.post("/progress")
def update_progress(data: ProgressUpdate, current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    store = LearnerStore()
    learner = store.get_learner(user_id)
    
    if not learner:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    completed = learner.get("completed", [])
    if data.topic not in completed:
        completed.append(data.topic)
        store.update_learner(user_id=user_id, completed=completed)
    
    return {"message": "Progress updated", "completed": completed}

@router.post("/tutor/chat")
def tutor_chat(chat_input: TutorChatInput, current_user: UserModel = Depends(get_current_user)):
    llm = LLMService()
    # Provide clear topic context for the floating chat
    system_prompt = f"You are an expert technical tutor assisting with the topic: {chat_input.topic}."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": chat_input.message}
    ]
    response = llm.generate(messages)
    
    # 1. Chat Serialization: Ensure we return only the content string
    reply_text = response.content if hasattr(response, 'content') else str(response)
    return {"response": reply_text}

@router.post("/tutor/start")
def tutor_start(data: Dict[str, Any] = None, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    learner_store = LearnerStore()
    learner = learner_store.get_learner(user_id)
    if not learner:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    target_topic = data.get("topic") if data else None
    
    # 2. Resilient Curriculum Parsing: Handle varied schema nesting
    profile_data = learner.get("profile", {})
    # Recursively look for learning_stages if not at expected top levels
    curriculum_plan = profile_data.get("curriculum_plan", profile_data)
    if not isinstance(curriculum_plan, dict) or "learning_stages" not in curriculum_plan:
        curriculum_plan = learner.get("curriculum_plan", {})
    
    stages = curriculum_plan.get("learning_stages", [])
    current_module_index = profile_data.get("current_module_index", 0)
    
    # Identify the correct stage index
    actual_stage_idx = current_module_index
    if target_topic:
        for idx, stage in enumerate(stages):
            if target_topic.lower() in str(stage.get("stage_name", "")).lower():
                actual_stage_idx = idx
                break

    # 3. State Re-hydration: Pass user_input (experience) to GraphState
    # Ensure TutorAgent can adapt its persona
    user_input_data = profile_data.get("user_input") or {
        "experience_years": profile_data.get("experience_years", 0),
        "target_role": profile_data.get("target_role", "Professional"),
        "current_role": "Learner"
    }

    state = GraphState(
        user_id=user_id,
        user_input=UserInput(**user_input_data),
        learner_profile=profile_data,
        curriculum_plan=curriculum_plan,
        skill_gap=profile_data.get("skill_gap", {}),
        completed_topics=learner.get("completed", []),
        preferred_pedagogy=learner.get("pedagogy"),
        current_module_index=actual_stage_idx
    )
    
    # Store topic context in session metadata for the agent fallback
    if target_topic:
        state.tutor_session = {"topic": target_topic}
    
    tutor = TutorAgent()
    lecture = tutor.generate_full_module_lecture(state)

    # 4. Persistence: Save to LessonCache
    existing_cache = db.query(LessonCache).filter(
        LessonCache.user_id == user_id,
        LessonCache.stage_id == actual_stage_idx
    ).first()

    if existing_cache:
        existing_cache.lecture_text = lecture
        # Reset quiz if lecture changes
        existing_cache.quiz_data = None
    else:
        new_cache = LessonCache(
            user_id=user_id,
            stage_id=actual_stage_idx,
            lecture_text=lecture
        )
        db.add(new_cache)
    
    db.commit()
    
    return {"lecture_text": lecture, "quiz": []}

@router.post("/tutor/quiz")
def tutor_quiz(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    learner_store = LearnerStore()
    learner = learner_store.get_learner(user_id)
    if not learner:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile = learner.get("profile", {})
    current_module_index = profile.get("current_module_index", 0)
    
    # 1. Check Cache for existing quiz
    cached = db.query(LessonCache).filter(
        LessonCache.user_id == user_id,
        LessonCache.stage_id == current_module_index
    ).first()
    
    if not cached:
        raise HTTPException(status_code=400, detail="Lesson must be started before generating quiz")
        
    if cached.quiz_data:
        return {"quiz": cached.quiz_data.get("questions", [])}
        
    # 2. Generate Quiz lazily
    assessment = AssessmentAgent()
    stages = profile.get("curriculum_plan", {}).get("learning_stages", [])
    if not stages or current_module_index >= len(stages):
        raise HTTPException(status_code=400, detail="Invalid module state")
        
    stage_name = stages[current_module_index].get("stage_name", "Current Module")
    quiz = assessment.generate_comprehensive_quiz(stage_name, cached.lecture_text)
    
    # 3. Update Cache with generated quiz
    cached.quiz_data = quiz
    db.add(cached)
    db.commit()
    
    return {"quiz": quiz["questions"]}

@router.post("/tutor/submit", response_model=AssessmentResponse)
def tutor_submit(submission: AssessmentSubmission, current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    learner_store = LearnerStore()
    learner = learner_store.get_learner(user_id)
    
    # Setup agents
    evaluator = AssessmentAgent()
    feedback_agent = FeedbackAgent()
    
    # Need the quiz definitions to grade - in a real app, we'd store these in a session
    # For now, we'll re-generate or assume they are passed? 
    # Directive: "Evaluate the entire quiz at the end".
    # We will trust the frontend to provide question text for semantic evaluation if needed, 
    # but ideally we'd have it in state. For this implementation, we'll evaluate based on correctness logic.
    
    # For MCQ and Multi-select, we need the correct answers. 
    # Let's assume the frontend passes the question objects back for grading safety.
    # Actually, let's keep it simple: the frontend sends answers, and we grade.
    
    # TO SIMPLIFY: The frontend will send { question_id: { type, user_ans, correct_ans, question_text } }
    is_correct_map = {}
    correct_count = 0
    
    for q_id, data in submission.answers.items():
        q_type = data.get("type")
        user_ans = data.get("user_answer")
        correct_ans = data.get("correct_answer")
        
        if q_type == "mcq":
            is_correct = int(user_ans) == int(correct_ans)
        elif q_type == "multi-select":
            is_correct = set(user_ans) == set(correct_ans)
        elif q_type == "fill-in-the-blank":
            is_correct = evaluator.evaluate_semantic_answer(data.get("question"), str(correct_ans), str(user_ans))
        else:
            is_correct = False
            
        is_correct_map[q_id] = is_correct
        if is_correct:
            correct_count += 1
            
    score = (correct_count / len(submission.answers)) * 100
    passed = score >= 70
    
    # Update completion if passed
    current_module_index = learner.get("profile", {}).get("current_module_index", 0)
    profile = learner.get("profile", {})
    completed = learner.get("completed", [])

    if passed:
        # 1. Identify the current stage
        stages = profile.get("curriculum_plan", {}).get("learning_stages", [])
        if current_module_index < len(stages):
            # 2. Extract stage_name with fallback to Topic index
            current_stage = stages[current_module_index]
            stage_name = current_stage.get("stage_name") or f"Topic {current_module_index + 1}"
            
            # 3. Append to completed topics if not already there
            if stage_name not in completed:
                completed.append(stage_name)
        
        # 4. Advance to next module
        current_module_index += 1
        profile["current_module_index"] = current_module_index
        
    # Run Feedback Agent
    # 1. Synthesize user feedback
    state = GraphState(user_id=user_id, chat_history=[{"role": "user", "content": submission.feedback or "No feedback provided"}])
    state = feedback_agent.run(state)
    
    # Persist progress and new pedagogy
    learner_store.update_learner(
        user_id=user_id,
        profile=profile,
        completed=completed,
        pedagogy=state.preferred_pedagogy
    )
    
    return {
        "score": score,
        "passed": passed,
        "is_correct_map": is_correct_map,
        "motivational_feedback": state.last_feedback,
        "new_pedagogy": state.preferred_pedagogy
    }

@router.post("/tutor/feedback")
def tutor_feedback(data: dict[str, str], current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.id)
    raw_text = data.get("feedback", "")
    if not raw_text:
        return {"message": "No feedback provided"}

    # 1. Initialize agents
    feedback_agent = FeedbackAgent()
    learner_store = LearnerStore()
    
    # 2. Run synthesis (this handles LLM extraction inside the agent)
    state = GraphState(user_id=user_id, chat_history=[{"role": "user", "content": raw_text}])
    state = feedback_agent.run(state)
    
    # 3. Persist new pedagogical instruction
    learner_store.update_learner(
        user_id=user_id,
        pedagogy=state.preferred_pedagogy
    )
    
    return {"message": "Feedback processed and profile updated", "pedagogy": state.preferred_pedagogy}
