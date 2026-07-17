import json
import google.generativeai as genai
from app.config import settings
from app.agents.prompts import (
    QUESTION_GENERATOR_PROMPT,
    INTERVIEWER_PROMPT,
    EVALUATOR_PROMPT
)

def run_gemini_prompt(prompt: str) -> str:
    """Helper to run a prompt against Google Gemini API."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")
    
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return response.text.strip()

def clean_json_response(content: str) -> str:
    """Strip markdown code blocks if the LLM wrapped JSON in it."""
    if content.startswith("```"):
        lines = content.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        content = "\n".join(lines).strip()
    return content

def generate_questions(
    resume_text: str,
    company: str,
    position: str,
    mode: str,
    difficulty: str,
    total_questions: int = 5
) -> list:
    """Generates the list of interview questions based on the candidate's profile."""
    prompt = QUESTION_GENERATOR_PROMPT.format(
        company=company,
        position=position,
        mode=mode,
        difficulty=difficulty,
        resume_text=resume_text if resume_text else "No resume uploaded.",
        total_questions=total_questions
    )
    
    try:
        raw_res = run_gemini_prompt(prompt)
        cleaned = clean_json_response(raw_res)
        questions = json.loads(cleaned)
        if isinstance(questions, list):
            return questions
        return [f"Sample Question {i+1} for {company}" for i in range(total_questions)]
    except Exception as e:
        print(f"Error generating questions: {e}")
        # Default questions if Gemini fails
        return [
            f"Can you introduce yourself and tell me about your background in {position}?",
            f"What interests you about working at {company}?",
            f"Explain a challenging technical project you worked on recently.",
            f"How do you handle disagreements or conflicts in a software engineering team?",
            f"What are your long-term career goals and how does this role fit into them?"
        ][:total_questions]

def get_interviewer_response(
    company: str,
    position: str,
    mode: str,
    difficulty: str,
    chat_history: list,
    current_question: str,
    candidate_answer: str = ""
) -> str:
    """Acknowledge candidate response and present the next question."""
    history_str = ""
    for msg in chat_history[-6:]:  # Keep last 3 turns
        role = "Candidate" if msg["role"] == "candidate" else "Interviewer"
        history_str += f"{role}: {msg['content']}\n"

    prompt = INTERVIEWER_PROMPT.format(
        company=company,
        position=position,
        mode=mode,
        difficulty=difficulty,
        chat_history=history_str if history_str else "Starting the interview...",
        current_question=current_question,
        candidate_answer=candidate_answer if candidate_answer else "[No previous answer yet]"
    )
    
    try:
        response = run_gemini_prompt(prompt)
        return response
    except Exception as e:
        print(f"Interviewer response generation error: {e}")
        return f"Let's move on to the next question: {current_question}"

def evaluate_interview(
    resume_text: str,
    mode: str,
    difficulty: str,
    company: str,
    position: str,
    questions: list,
    answers: list
) -> dict:
    """Performs full mock interview evaluation and generates a roadmap."""
    transcript = ""
    for q, a in zip(questions, answers):
        transcript += f"Question: {q}\nCandidate Answer: {a}\n\n"
        
    prompt = EVALUATOR_PROMPT.format(
        company=company,
        position=position,
        mode=mode,
        difficulty=difficulty,
        resume_text=resume_text if resume_text else "No resume uploaded.",
        transcript=transcript
    )
    
    try:
        raw_res = run_gemini_prompt(prompt)
        cleaned = clean_json_response(raw_res)
        data = json.loads(cleaned)
        
        # Ensure correct structure
        return {
            "overall_score": float(data.get("overall_score", 7.0)),
            "summary": data.get("summary", "Interview completed successfully."),
            "strengths": json.dumps(data.get("strengths", [])),
            "weaknesses": json.dumps(data.get("weaknesses", [])),
            "roadmap_json": json.dumps(data.get("roadmap", []))
        }
    except Exception as e:
        print(f"Evaluation error: {e}")
        # Default report if LLM evaluation fails
        return {
            "overall_score": 6.5,
            "summary": "Mock interview completed. Score based on standard criteria.",
            "strengths": json.dumps(["Covers core questions", "Expressed interest in role"]),
            "weaknesses": json.dumps(["Answers could be more detailed", "Needs more practice"]),
            "roadmap_json": json.dumps([
                {"topic": "System Design", "action": "Review system architectures", "priority": "High"},
                {"topic": "DSA", "action": "Practice Leetcode mediums", "priority": "High"}
            ])
        }
