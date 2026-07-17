from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_password_hash

# User CRUD
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pw = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_pw,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Resume CRUD
def get_resumes_by_user(db: Session, user_id: int):
    return db.query(models.Resume).filter(models.Resume.user_id == user_id).all()

def create_user_resume(db: Session, resume: schemas.ResumeCreate, user_id: int):
    # Check if there is an existing resume, if so update it, otherwise create new
    existing = db.query(models.Resume).filter(models.Resume.user_id == user_id).first()
    if existing:
        existing.filename = resume.filename
        existing.parsed_text = resume.parsed_text
        existing.skills = resume.skills
        existing.experience = resume.experience
        existing.projects = resume.projects
        db.commit()
        db.refresh(existing)
        return existing

    db_resume = models.Resume(
        **resume.model_dump(),
        user_id=user_id
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume

# InterviewSession CRUD
def get_session(db: Session, session_id: int):
    return db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()

def get_sessions_by_user(db: Session, user_id: int):
    return db.query(models.InterviewSession).filter(models.InterviewSession.user_id == user_id).order_by(models.InterviewSession.created_at.desc()).all()

def create_session(db: Session, session: schemas.SessionCreate, user_id: int, questions_json: str = None):
    db_session = models.InterviewSession(
        company=session.company,
        position=session.position,
        mode=session.mode,
        difficulty=session.difficulty,
        total_questions=session.total_questions,
        questions_json=questions_json,
        user_id=user_id
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def update_session_index(db: Session, session_id: int, new_index: int, status: str = "active"):
    db_session = get_session(db, session_id)
    if db_session:
        db_session.current_question_index = new_index
        db_session.status = status
        db.commit()
        db.refresh(db_session)
    return db_session

# InterviewMessage CRUD
def add_session_message(db: Session, session_id: int, role: str, content: str):
    db_message = models.InterviewMessage(
        session_id=session_id,
        role=role,
        content=content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

# Evaluation CRUD
def create_evaluation(db: Session, evaluation: schemas.EvaluationBase, session_id: int):
    # Remove existing evaluation if it exists
    existing = db.query(models.Evaluation).filter(models.Evaluation.session_id == session_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    db_eval = models.Evaluation(
        **evaluation.model_dump(),
        session_id=session_id
    )
    db.add(db_eval)
    db.commit()
    db.refresh(db_eval)
    return db_eval

def get_evaluation(db: Session, session_id: int):
    return db.query(models.Evaluation).filter(models.Evaluation.session_id == session_id).first()
