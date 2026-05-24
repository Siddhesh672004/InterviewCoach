# MockMind AI — Adaptive Mock Interview Coach

An AI interviewer that speaks to you, listens to your voice answers, asks follow-up questions when you stumble, and gives a detailed performance report. Runs entirely on free tiers.

**Stack:** Python · LangGraph · FastAPI · React 18 (Vite) · Groq (Llama 3.3 70B) · Web Speech API
**Cost:** ₹0 / $0

---

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac / Linux

pip install -r requirements.txt

# Copy .env.example to .env and fill in your free Groq key from console.groq.com
copy .env.example .env         # Windows
# cp .env.example .env         # Mac / Linux

uvicorn server:app --reload --port 8001
```

Backend runs at `http://localhost:8001`. Swagger UI at `http://localhost:8001/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`. Open it in Chrome or Edge for voice support.

---

## Architecture

```
React (Vite)  ──HTTP──►  FastAPI  ──►  LangGraph  ──►  Groq Llama 3.3 70B
     │                       │
     ├─ Web Speech STT       └─ In-process session dict (MemorySaver)
     └─ Web Speech TTS
```

- `POST /start` — initialize session, generate first question
- `POST /answer` — evaluate answer, branch to follow-up / next topic / wrap-up
- `GET /report/{session_id}` — fetch the final report
- `GET /health` — liveness check

The interview flow is a LangGraph state machine driven node-by-node from the API handlers. Sessions live in an in-process dict (no DB in v1.0).

---

## Project Layout

```
backend/
├── llm.py        Groq client + JSON-parse helper
├── prompts.py    Question / follow-up / evaluate / report templates
├── graph.py      LangGraph state, nodes, conditional edges
├── models.py     Pydantic request/response models
├── server.py     FastAPI app + endpoints
└── requirements.txt

frontend/
├── src/
│   ├── pages/        LandingPage, SetupScreen, InterviewScreen, ReportScreen
│   ├── components/   AiAvatar, ChatWindow, VoiceInput, ScoreSidebar, ProgressBar
│   ├── hooks/        useSpeechRecognition, useSpeechSynthesis
│   ├── api/          interviewApi.js
│   ├── data/         topics.js (role → topics map)
│   └── styles/       global.css
├── package.json
└── vite.config.js
```

See `IMPLEMENTATION_PLAN.md` for the full milestone breakdown.

---

## Configuration

**Backend** — `backend/.env`:
- `GROQ_API_KEY` (required) — get one free at console.groq.com
- `ALLOWED_ORIGIN` — comma-separated CORS origins. Default: `http://localhost:3000`
- `GROQ_MODEL` — defaults to `llama-3.3-70b-versatile`

**Frontend** — `frontend/.env.local`:
- `VITE_API_URL` — backend URL. Default: `http://localhost:8001`

---

## Deployment

**Backend → Render**
- Root: `backend/`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Env: `GROQ_API_KEY`, `ALLOWED_ORIGIN=<your vercel url>`

**Frontend → Vercel**
- Root: `frontend/`
- Framework preset: Vite
- Env: `VITE_API_URL=<your render url>`

---

## Notes

- Voice features require a Chromium-based browser (Chrome, Edge). Firefox and Safari fall back to text input.
- Render free tier sleeps after 15 minutes of inactivity. The first request after sleep takes ~30 seconds to wake the server.
- Groq free tier limits: 30 requests/minute, 14,400/day. A single 4-topic interview averages ~13 calls.
