import json
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base, SessionLocal

class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    history = Column(Text)  # Stores JSON string of messages
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class SessionStore:
    def __init__(self):
        # Ensure tables exist
        from database import engine
        Base.metadata.create_all(bind=engine)

    def get_history(self, session_id: str):
        db = SessionLocal()
        try:
            session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
            if session:
                return json.loads(session.history)
            return []
        finally:
            db.close()

    def save_history(self, session_id: str, history: list):
        db = SessionLocal()
        try:
            session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
            history_json = json.dumps(history)
            
            if session:
                session.history = history_json
            else:
                new_session = SessionModel(session_id=session_id, history=history_json)
                db.add(new_session)
            
            db.commit()
        finally:
            db.close()
