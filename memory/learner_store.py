import json
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base, SessionLocal

class LearnerModel(Base):
    __tablename__ = "learners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    profile_data = Column(Text)  # JSON
    mastery_scores = Column(Text)  # JSON e.g. {"Python": 2}
    completed_topics = Column(Text)  # JSON [topic1, topic2]
    pedagogical_preference = Column(Text, nullable=True) # Persistent feedback string
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class LearnerStore:
    def __init__(self):
        from database import engine
        Base.metadata.create_all(bind=engine)

    def get_learner(self, user_id: str):
        db = SessionLocal()
        try:
            learner = db.query(LearnerModel).filter(LearnerModel.user_id == user_id).first()
            if learner:
                return {
                    "profile": json.loads(learner.profile_data),
                    "mastery": json.loads(learner.mastery_scores),
                    "completed": json.loads(learner.completed_topics),
                    "pedagogy": learner.pedagogical_preference
                }
            return None
        finally:
            db.close()

    def update_learner(self, user_id: str, profile=None, mastery=None, completed=None, pedagogy=None):
        db = SessionLocal()
        try:
            learner = db.query(LearnerModel).filter(LearnerModel.user_id == user_id).first()
            
            if not learner:
                learner = LearnerModel(
                    user_id=user_id,
                    profile_data=json.dumps(profile or {}),
                    mastery_scores=json.dumps(mastery or {}),
                    completed_topics=json.dumps(completed or []),
                    pedagogical_preference=pedagogy
                )
                db.add(learner)
            else:
                if profile: learner.profile_data = json.dumps(profile)
                if mastery: learner.mastery_scores = json.dumps(mastery)
                if completed: learner.completed_topics = json.dumps(completed)
                if pedagogy: learner.pedagogical_preference = pedagogy
            
            db.commit()
        finally:
            db.close()
