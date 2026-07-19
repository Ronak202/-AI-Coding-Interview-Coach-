# 🎓 AI Coding Interview Coach

A full-stack AI-powered mock interview platform that simulates real technical interviews with voice support, resume-grounded questions, and detailed evaluation reports.

![Tech Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python-009688?style=flat-square&logo=fastapi&logoColor=white)
![AI](https://img.shields.io/badge/AI-Google%20Gemini%201.5%20Flash-4285F4?style=flat-square&logo=google)
![Vector DB](https://img.shields.io/badge/Vector%20DB-FAISS-orange?style=flat-square)

---

## ✨ Features

- 📄 **Resume Intelligence** — Upload PDF resume; AI extracts skills, projects & experience into a FAISS vector store (RAG)
- 🤖 **AI Question Generation** — Gemini 1.5 Flash generates personalized questions grounded in your actual background
- 🏢 **Company-Specific Modes** — Google (algorithmic depth), Amazon (Leadership Principles), Microsoft, Netflix, Meta
- 🎯 **4 Interview Tracks** — DSA · System Design · CS Fundamentals · Behavioral & HR
- 📊 **3 Difficulty Levels** — Easy (Internship) · Medium (L2) · Hard (Elite Programs)
- 🎤 **Voice Interview** — Speech-to-Text mic input + Text-to-Speech AI interviewer (Web Speech API)
- 🔇 **Mute/Unmute Toggle** — Silence or re-read the last question on demand
- 📈 **Session Progress Bar** — Real-time "Question X of N" with animated fill
- 💬 **Typing Indicator** — 3-dot bubble while AI is processing your answer
- 📋 **Evaluation Report** — Score out of 10 (radial ring chart), strengths, weaknesses, summary
- 🗺️ **Personalized Roadmap** — Prioritized prep plan with checkable topic items (persisted in localStorage)
- 📊 **Session History Dashboard** — All past sessions with company, role, mode, difficulty, score
- 🔐 **JWT Auth** — Sign up / Sign in with secure bcrypt passwords, session persists across refresh
- 🎉 **Confetti animations** — On resume upload & evaluation completion

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Vanilla CSS, Lucide Icons, Canvas Confetti |
| **Backend** | FastAPI, Uvicorn, Python 3.10+ |
| **Auth** | JWT (python-jose), bcrypt (passlib) |
| **Database** | SQLite via SQLAlchemy ORM |
| **LLM** | Google Gemini 1.5 Flash |
| **Embeddings** | Gemini `embedding-001` (768-dim) |
| **Vector DB** | FAISS (IndexFlatL2, in-memory) |
| **Speech** | Web Speech API (browser-native) |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone the repo
```bash
git clone https://github.com/Ronak202/-AI-Coding-Interview-Coach-.git
cd "-AI-Coding-Interview-Coach-"
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 4. Open in browser
- **Frontend**: http://localhost:5173
- **Backend API docs**: http://localhost:8000/docs

---

## 📁 Project Structure

```
AI COACH/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── graph.py      # 3 Gemini agents: question gen, interviewer, evaluator
│   │   │   ├── prompts.py    # Prompt templates for each agent
│   │   │   └── state.py      # Agent state definitions
│   │   ├── auth.py           # JWT + bcrypt authentication
│   │   ├── config.py         # Settings & env loading
│   │   ├── crud.py           # Database operations
│   │   ├── database.py       # SQLAlchemy engine & session
│   │   ├── main.py           # FastAPI routes
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── parser.py         # PDF parsing + LLM resume extraction
│   │   ├── rag.py            # FAISS vector store + embedding
│   │   └── schemas.py        # Pydantic schemas
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main application (1200+ lines)
    │   └── index.css         # Global styles + design system
    ├── index.html
    └── package.json
```

---

## 🔑 Environment Variables

Create `backend/.env` from the example:

```env
DATABASE_URL=sqlite:///./sql_app.db
SECRET_KEY=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

---

## 📸 Screenshots

### Dashboard
Stats, past sessions, resume RAG status — all at a glance.

### Interview Room
Live AI interviewer with voice, progress bar, and typing indicator.

### Evaluation Report
Radial score ring, strengths/weaknesses, personalized prep roadmap.

---

## 🏗️ Architecture

```
User → React Frontend
         ↓ REST API (FastAPI)
         ├── Auth (JWT)
         ├── Resume Upload → PDF Parser → Gemini LLM extraction → FAISS Vector DB
         ├── Session Create → Question Generator Agent (Gemini)
         ├── Answer Submit → Interviewer Agent (Gemini) → next question
         └── Session Complete → Evaluator Agent (Gemini) → score + roadmap
```

---
