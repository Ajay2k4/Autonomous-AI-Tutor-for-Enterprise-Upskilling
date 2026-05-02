from sqlalchemy import create_engine, Column, Integer, String, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./tutor_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class LessonCache(Base):
    __tablename__ = "lesson_cache"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    stage_id = Column(Integer, index=True) # Index of the learning stage
    lecture_text = Column(Text)
    quiz_data = Column(JSON, nullable=True) # Optional: cached quiz for the lecture

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
