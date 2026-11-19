# MindEase — AI-Powered Mental Health Companion

> Major Project | Group RG82 | JUIT AY 2026-27

A full-stack web application that provides empathetic AI-powered mental health support with real-time sentiment analysis, mood tracking, and an analytics dashboard.

---

## Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | React 18 + Vite + TailwindCSS + Recharts      |
| Backend    | FastAPI + Python 3.11                         |
| Database   | PostgreSQL 16                                 |
| AI / NLP   | OpenAI GPT-4o + HuggingFace Transformers      |
| Auth       | JWT (python-jose + bcrypt)                    |
| Deployment | Render (backend) + Vercel (frontend)          |

---

## Project Structure

```
mindease/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── config.py         # Pydantic settings
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── models.py         # ORM models (User, ChatSession, Message, MoodEntry)
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── security.py       # JWT creation + get_current_user dependency
│   │   ├── sentiment.py      # Emotion & sentiment analysis (transformer + fallback)
│   │   └── routers/
│   │       ├── auth.py       # POST /register, POST /login, GET /me
│   │       ├── chat.py       # POST /send, GET/DELETE /sessions
│   │       ├── mood.py       # GET/POST /entries
│   │       └── analytics.py  # GET /summary
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api/axios.js
    │   ├── context/AuthContext.jsx
    │   ├── components/Layout.jsx
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── RegisterPage.jsx
    │       ├── ChatPage.jsx
    │       └── DashboardPage.jsx
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 16

### 1. Database

```sql
-- In psql or pgAdmin:
CREATE DATABASE mindease_db;
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env — set DATABASE_URL and OPENAI_API_KEY

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Features

- **Secure auth** — JWT registration/login with bcrypt password hashing
- **AI chat** — GPT-4o powered empathetic responses (graceful fallback if no API key)
- **Sentiment analysis** — Per-message emotion detection (joy, sadness, anxiety, anger, hope, fear, neutral)
- **Mood tracking** — Every message automatically logs a mood entry to PostgreSQL
- **Dashboard** — Line chart (mood trend), pie chart (emotion distribution), bar chart (daily check-ins)
- **Session management** — Multiple chat sessions with history, rename, delete
- **Crisis resources** — iCall, Vandrevala Foundation, NIMHANS helpline numbers always visible
- **Responsive design** — Mobile-friendly sidebar layout

---

## API Endpoints

| Method | Path                           | Description                  |
|--------|--------------------------------|------------------------------|
| POST   | /api/auth/register             | Register new user            |
| POST   | /api/auth/login                | Login, returns JWT           |
| GET    | /api/auth/me                   | Get current user             |
| POST   | /api/chat/send                 | Send message, get AI reply   |
| GET    | /api/chat/sessions             | List user's sessions         |
| GET    | /api/chat/sessions/{id}        | Get session with messages    |
| DELETE | /api/chat/sessions/{id}        | Delete session               |
| GET    | /api/mood/entries              | Get mood history             |
| POST   | /api/mood/entries              | Manual mood entry            |
| GET    | /api/analytics/summary         | Dashboard analytics          |

---

## Team

| Roll No.  | Name            | Role                        |
|-----------|-----------------|-----------------------------|
| 231033041 | Shivam          | Frontend Developer (React)  |
| 231033046 | Ishmeet Singh   | Backend Developer (APIs/DB) |
| 231033007 | Akhilesh Mahajan| ML Engineer                 |
| 231034012 | Garvit Khatter  | DevOps, Testing, Docs       |

Supervisor: Mr. Priyardarshi (Assistant Professor Grade 1)

---

## Crisis Helplines

| Organisation         | Contact        |
|----------------------|----------------|
| iCall India          | 9152987821     |
| Vandrevala Foundation| 1860-2662-345  |
| NIMHANS              | 080-46110007   |
