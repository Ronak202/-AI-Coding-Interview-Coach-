from typing import TypedDict, List, Dict, Any, Optional

class InterviewState(TypedDict):
    resume_text: str
    company: str
    position: str
    mode: str  # DSA, HR, SYSTEM_DESIGN, CS_FUNDAMENTALS
    difficulty: str  # Easy, Medium, Hard
    questions: List[str]
    current_question_index: int
    answers: List[str]
    chat_history: List[Dict[str, str]]  # list of {"role": "interviewer"|"candidate", "content": "..."}
    evaluation: Optional[Dict[str, Any]]
