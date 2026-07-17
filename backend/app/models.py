import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    resumes = relationship("Resume", back_populates="owner", cascade="all, delete-orphan")
    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    parsed_text = Column(Text, nullable=False)
    skills = Column(Text, nullable=True)  # JSON representation of skill list
    experience = Column(Text, nullable=True)  # JSON representation of experience list
    projects = Column(Text, nullable=True)  # JSON representation of projects list
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="resumes")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company = Column(String, nullable=False)
    position = Column(String, nullable=False)
    mode = Column(String, nullable=False)  # DSA, CS_FUNDAMENTALS, HR, SYSTEM_DESIGN
    difficulty = Column(String, default="Medium")  # Easy, Medium, Hard
    total_questions = Column(Integer, default=5)
    current_question_index = Column(Integer, default=0)
    questions_json = Column(Text, nullable=True)  # JSON list of generated questions
    status = Column(String, default="active")  # active, completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    messages = relationship("InterviewMessage", back_populates="session", cascade="all, delete-orphan")
    evaluation = relationship("Evaluation", uselist=False, back_populates="session", cascade="all, delete-orphan")

class InterviewMessage(Base):
    __tablename__ = "interview_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # interviewer, candidate
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("InterviewSession", back_populates="messages")

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    overall_score = Column(Float, nullable=False)
    summary = Column(Text, nullable=False)
    strengths = Column(Text, nullable=True)  # JSON array
    weaknesses = Column(Text, nullable=True)  # JSON array
    roadmap_json = Column(Text, nullable=True)  # Detailed roadmap JSON
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("InterviewSession", back_populates="evaluation")
