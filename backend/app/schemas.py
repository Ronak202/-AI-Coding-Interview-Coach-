from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Resume Schemas
class ResumeBase(BaseModel):
    filename: str

class ResumeCreate(ResumeBase):
    parsed_text: str
    skills: Optional[str] = None
    experience: Optional[str] = None
    projects: Optional[str] = None

class Resume(ResumeBase):
    id: int
    user_id: int
    skills: Optional[str] = None
    experience: Optional[str] = None
    projects: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Message Schemas
class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Evaluation Schemas
class EvaluationBase(BaseModel):
    overall_score: float
    summary: str
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    roadmap_json: Optional[str] = None

class Evaluation(EvaluationBase):
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Session Schemas
class SessionCreate(BaseModel):
    company: str
    position: str
    mode: str
    difficulty: Optional[str] = "Medium"
    total_questions: Optional[int] = 5

class SessionAnswer(BaseModel):
    answer: str

class Session(BaseModel):
    id: int
    user_id: int
    company: str
    position: str
    mode: str
    difficulty: str
    total_questions: int
    current_question_index: int
    questions_json: Optional[str] = None
    status: str
    created_at: datetime
    messages: List[Message] = []
    evaluation: Optional[Evaluation] = None

    class Config:
        from_attributes = True
