import io
import json
import PyPDF2
import google.generativeai as genai
from app.config import settings

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text contents from a PDF byte stream."""
    pdf_file = io.BytesIO(pdf_bytes)
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

def parse_resume_with_llm(resume_text: str) -> dict:
    """Use Google Gemini API to parse raw resume text into structured JSON."""
    if not settings.GEMINI_API_KEY:
        # Fallback if no API key is provided
        return {
            "skills": "[\"Please configure GEMINI_API_KEY\"]",
            "experience": "[]",
            "projects": "[]"
        }
    
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
        Analyze the following resume text and extract the candidate's core skills, professional experience, and key projects.
        Format the output strictly as a JSON object with the following keys:
        - "skills": A list of strings (e.g., ["Python", "FastAPI", "React"])
        - "experience": A list of objects, each containing:
            - "company": String
            - "role": String
            - "duration": String
            - "description": String
        - "projects": A list of objects, each containing:
            - "title": String
            - "description": String
            - "tech_stack": A list of strings
        
        Only return the JSON block, no markdown formatting (like ```json).
        
        Resume text:
        {resume_text}
        """
        
        response = model.generate_content(prompt)
        content = response.text.strip()
        
        # Clean markdown codeblocks if LLM returned them
        if content.startswith("```"):
            lines = content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
            
        data = json.loads(content)
        
        # Serialize fields back to string JSON for DB storage
        return {
            "skills": json.dumps(data.get("skills", [])),
            "experience": json.dumps(data.get("experience", [])),
            "projects": json.dumps(data.get("projects", []))
        }
    except Exception as e:
        print(f"Error parsing resume: {e}")
        # Return sensible defaults on failure
        return {
            "skills": "[]",
            "experience": "[]",
            "projects": "[]"
        }
