import json
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas, crud, auth, database, parser, rag
from app.agents import graph
from app.database import engine, get_db

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Interview Prep Platform API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication Endpoints
@app.post("/api/auth/signup", response_model=schemas.Token)
def signup(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user_data.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_user = crud.create_user(db, user_data)
    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, form_data.username)  # username is email in OAuth2 form
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# Resume Endpoints
@app.post("/api/resumes/upload", response_model=schemas.Resume)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF resumes are supported"
        )
    
    try:
        pdf_bytes = await file.read()
        parsed_text = parser.extract_text_from_pdf(pdf_bytes)
        
        # Use LLM to extract structure (skills, experience, projects)
        parsed_structure = parser.parse_resume_with_llm(parsed_text)
        
        resume_data = schemas.ResumeCreate(
            filename=file.filename,
            parsed_text=parsed_text,
            skills=parsed_structure["skills"],
            experience=parsed_structure["experience"],
            projects=parsed_structure["projects"]
        )
        
        db_resume = crud.create_user_resume(db, resume_data, current_user.id)
        return db_resume
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process resume: {str(e)}"
        )

@app.get("/api/resumes/my", response_model=schemas.Resume)
def get_my_resume(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    resumes = crud.get_resumes_by_user(db, current_user.id)
    if not resumes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found. Please upload one."
        )
    return resumes[0]

# Interview Session Endpoints
@app.post("/api/interviews/sessions", response_model=schemas.Session)
def create_interview_session(
    session_data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Fetch user's resume to ground the questions
    resumes = crud.get_resumes_by_user(db, current_user.id)
    resume_text = resumes[0].parsed_text if resumes else ""
    
    # Generate custom questions using LLM/Gemini
    questions = graph.generate_questions(
        resume_text=resume_text,
        company=session_data.company,
        position=session_data.position,
        mode=session_data.mode,
        difficulty=session_data.difficulty,
        total_questions=session_data.total_questions
    )
    
    questions_json = json.dumps(questions)
    
    # Save the session
    session = crud.create_session(db, session_data, current_user.id, questions_json)
    
    # Generate the initial interviewer message asking the first question
    first_question = questions[0] if questions else "Let's begin! Can you introduce yourself?"
    
    initial_prompt = graph.get_interviewer_response(
        company=session.company,
        position=session.position,
        mode=session.mode,
        difficulty=session.difficulty,
        chat_history=[],
        current_question=first_question,
        candidate_answer=""
    )
    
    crud.add_session_message(db, session.id, role="interviewer", content=initial_prompt)
    
    # Refresh to include the message in response
    db.refresh(session)
    return session

@app.get("/api/interviews/sessions", response_model=List[schemas.Session])
def get_user_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.get_sessions_by_user(db, current_user.id)

@app.get("/api/interviews/sessions/{session_id}", response_model=schemas.Session)
def get_session_details(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = crud.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return session

@app.post("/api/interviews/sessions/{session_id}/answer", response_model=schemas.Session)
def submit_answer(
    session_id: int,
    payload: schemas.SessionAnswer,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = crud.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview session already completed"
        )

    # Save candidate's answer
    crud.add_session_message(db, session_id, role="candidate", content=payload.answer)
    
    # Parse the questions
    questions = json.loads(session.questions_json) if session.questions_json else []
    
    next_index = session.current_question_index + 1
    
    # Check if there are more questions
    if next_index < len(questions):
        # Update session state to next question index
        crud.update_session_index(db, session_id, next_index, status="active")
        
        # Prepare history for the interviewer agent
        chat_history = [{"role": msg.role, "content": msg.content} for msg in session.messages]
        
        # Generate the next interviewer dialog
        next_question = questions[next_index]
        interviewer_response = graph.get_interviewer_response(
            company=session.company,
            position=session.position,
            mode=session.mode,
            difficulty=session.difficulty,
            chat_history=chat_history,
            current_question=next_question,
            candidate_answer=payload.answer
        )
        
        crud.add_session_message(db, session_id, role="interviewer", content=interviewer_response)
        db.refresh(session)
        return session
    else:
        # No more questions - set session status as completed
        crud.update_session_index(db, session_id, session.current_question_index, status="completed")
        
        # Pull resume parsed text
        resumes = crud.get_resumes_by_user(db, current_user.id)
        resume_text = resumes[0].parsed_text if resumes else ""
        
        # Gather all candidate answers and questions
        candidate_answers = []
        interviewer_questions = []
        
        # Read from messages list
        for msg in session.messages:
            if msg.role == "candidate":
                candidate_answers.append(msg.content)
            elif msg.role == "interviewer":
                # Find corresponding question
                interviewer_questions.append(msg.content)
                
        # Run Evaluation Agent (LangGraph/LLM evaluation)
        eval_result = graph.evaluate_interview(
            resume_text=resume_text,
            mode=session.mode,
            difficulty=session.difficulty,
            company=session.company,
            position=session.position,
            questions=questions,
            answers=candidate_answers
        )
        
        evaluation_data = schemas.EvaluationBase(
            overall_score=eval_result["overall_score"],
            summary=eval_result["summary"],
            strengths=eval_result["strengths"],
            weaknesses=eval_result["weaknesses"],
            roadmap_json=eval_result["roadmap_json"]
        )
        
        crud.create_evaluation(db, evaluation_data, session_id)
        
        db.refresh(session)
        return session

@app.get("/api/interviews/sessions/{session_id}/evaluation", response_model=schemas.Evaluation)
def get_session_evaluation(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = crud.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    evaluation = crud.get_evaluation(db, session_id)
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation report not generated yet"
        )
    return evaluation
