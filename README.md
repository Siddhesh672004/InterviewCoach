# Adaptive Mock Interview Coach

> An AI-powered, voice-enabled mock interview platform that adapts to your resume, the job you're chasing, and how you actually answer — built with FastAPI + LangGraph on the backend and React + Vite on the frontend, powered by free Groq Llama 3.3 70B inference.

---

## Table of Contents

1. [Why this project exists](#why-this-project-exists)
2. [What it does](#what-it-does)
3. [Live tour of a session](#live-tour-of-a-session)
4. [Tech stack](#tech-stack)
5. [Architecture at a glance](#architecture-at-a-glance)
6. [Project structure](#project-structure)
7. [Prerequisites](#prerequisites)
8. [Quick start](#quick-start)
9. [Configuration](#configuration)
10. [API reference](#api-reference)
11. [Interview modes](#interview-modes)
12. [LangGraph state machine](#langgraph-state-machine)
13. [Frontend architecture](#frontend-architecture)
14. [Voice (Web Speech API)](#voice-web-speech-api)
15. [Resilience & error handling](#resilience--error-handling)
16. [Privacy & data handling](#privacy--data-handling)
17. [Troubleshooting](#troubleshooting)
18. [Roadmap](#roadmap)
19. [License](#license)

---

## Why this project exists

Hiring loops are stressful. You sit alone in a room, rehearse generic questions off a YouTube list, and walk into the real interview having never been **probed**, **scored**, or **redirected** the way an actual interviewer would do it.

This project closes that gap with three concrete goals:

1. **Realistic pressure** — the AI behaves like a strict-but-fair interviewer at a top tech company. It asks one question, evaluates the answer on a 1–10 scale, and follows up when the answer is weak.
2. **Personalisation that's actually useful** — drop in your resume or paste a real JD, and the questions stop being generic. They probe the projects you've shipped or the skills the company is hiring for.
3. **A learning vehicle** — for me as the author, the real goal is to learn the **Python backend stack** end-to-end: how FastAPI serves JSON, how Pydantic validates it, and most importantly how **LangGraph** turns LLM calls into a state machine instead of a stream of disconnected prompts. See [EXPLANATION.md](./EXPLANATION.md) for the deep dive.

Free to run end-to-end (Groq's free tier covers Llama 3.3 70B), no database, no auth, no vendor lock-in.

---

## What it does

- **Five interview modes**: Quick Practice, Technical Deep-Dive, Resume-Driven, JD-Targeted, HR/Behavioral.
- **Adaptive question loop**: weak answer → follow-up; solid answer → next topic; final topic → wrap-up report.
- **Resume parsing** for PDF / DOCX / DOC / TXT, max 5 MB. Extracts skills, projects, years of experience, domains.
- **JD analysis**: extracts required skills, seniority, focus areas, responsibilities.
- **Voice mode**: speech-to-text input (browser SpeechRecognition) + AI text-to-speech output (SpeechSynthesis).
- **Live progress UI**: per-topic dots, live status pill, elapsed timer, internal chat scroll.
- **Final report**: overall score, letter grade, per-topic breakdown, strengths/weaknesses, action plan with concrete resources, resume-vs-JD alignment notes.

---

## Live tour of a session

```
1. Land on /                 → marketing landing page
2. Click "Start"             → /setup (mode picker, resume drop, JD paste, topics, voice)
3. Click "Begin interview"   → POST /start          (server returns first question)
4. /interview                → chat UI, AI speaks Q, you answer (text or mic)
5. Submit answer             → POST /answer         (server evaluates, returns next Q or wrap-up)
6. Loop until all topics done
7. /report                   → personalised final report
```

Each `/answer` call is a single transition through the LangGraph: `evaluate_answer → route_decision → (bump_followup | record_and_advance | wrap_up_report) → generate_question`.

---

## Tech stack

### Backend
| Concern | Choice | Why |
|---|---|---|
| Web framework | **FastAPI** | Async, automatic OpenAPI docs, Pydantic validation, fast startup |
| LLM orchestration | **LangGraph** | Models the interview as a state machine, not a chain |
| LLM client | **langchain-groq** | Free, very fast Llama 3.3 70B inference |
| Validation | **Pydantic v2** | Type-safe request/response models |
| Resume parsing | **pypdf** + **python-docx** | Pure-Python, no native deps |
| Multipart | **python-multipart** | Required by FastAPI's `UploadFile` |
| ASGI server | **Uvicorn** | Production-grade, hot reload in dev |

### Frontend
| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite 5** | Fast HMR, ES module dev server, replaces deprecated CRA |
| UI library | **React 18** | Component model the team is comfortable with |
| Routing | **React Router v6** | Nested layouts via `<Outlet />` |
| HTTP | **Axios** | Cleaner ergonomics than `fetch` for FormData |
| Styling | **CSS Modules** + design tokens | Scoped styles, no Tailwind config to ship |
| Voice | **Web Speech API** | Built into Chrome/Edge, no third-party SDK |

---

## Architecture at a glance

```
            ┌──────────────────────────────────────────────┐
            │                  Browser                     │
            │  React + Vite ─ CSS Modules ─ Web Speech API │
            └─────────────────────┬────────────────────────┘
                                  │  fetch / axios (JSON, multipart)
                                  ▼
            ┌──────────────────────────────────────────────┐
            │            FastAPI (Uvicorn)                 │
            │  /start /answer /report /upload-resume       │
            │  /parse-jd /suggest-topics /health           │
            └─────┬─────────┬─────────────┬────────────────┘
                  │         │             │
                  ▼         ▼             ▼
              parsers     graph.py    in-memory
              (PDF/DOCX) (LangGraph)  sessions dict
                              │
                              ▼
                       langchain-groq
                              │
                              ▼
                       Groq Cloud API
                       Llama 3.3 70B
```

- No database. Sessions live in a Python dict keyed by `uuid4`. Acceptable for a single-instance, single-user demo (per the PRD).
- No auth. CORS is locked to localhost in dev; set `ALLOWED_ORIGIN` to your frontend domain in production.

---

## Project structure

```
InterviewCoach/
├── README.md                           ← you are here
├── EXPLANATION.md                      ← deep-dive learning doc
├── IMPLEMENTATION_PLAN.md              ← original milestone breakdown
├── InterviewCoach_PRD.docx             ← product requirements
│
├── backend/
│   ├── server.py                       FastAPI app + 7 endpoints
│   ├── graph.py                        LangGraph state, nodes, edges
│   ├── prompts.py                      All LLM prompt templates
│   ├── llm.py                          Groq client + JSON-parsing helper
│   ├── parsers.py                      PDF / DOCX / TXT extraction
│   ├── models.py                       Pydantic request/response models
│   ├── requirements.txt
│   └── .env                            (you create this)
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx                    React entry
        ├── App.jsx                     Router + InterviewContext
        ├── api/interviewApi.js         Axios wrappers for every endpoint
        ├── data/topics.js              Roles → topic catalogue
        ├── hooks/
        │   ├── useSpeechSynthesis.js   TTS with voicesReady gate
        │   └── useSpeechRecognition.js STT (continuous, interim results)
        ├── components/
        │   ├── Navbar.jsx / Footer.jsx / MarketingLayout.jsx
        │   ├── AiAvatar.jsx            Animated equalizer
        │   ├── ChatWindow.jsx          Bubble list with internal scroll
        │   ├── VoiceInput.jsx          Mic + textarea + submit
        │   ├── ProgressBar.jsx         Per-topic dots
        │   └── ScoreSidebar.jsx        Live per-topic scoreboard
        └── pages/
            ├── LandingPage.jsx         Premium dark hero, FAQ, modes
            ├── FeaturesPage.jsx
            ├── HowItWorksPage.jsx
            ├── PricingPage.jsx
            ├── SetupScreen.jsx         Mode + resume + JD + topics
            ├── InterviewScreen.jsx     The live interview UI
            └── ReportScreen.jsx        Final personalised report
```

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **A free Groq API key** — sign up at <https://console.groq.com>

---

## Quick start

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1            # PowerShell
pip install -r requirements.txt
```

Create `backend/.env`:

```
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
ALLOWED_ORIGIN=http://localhost:3000,http://localhost:5173
```

Run the server:

```powershell
python -m uvicorn server:app --reload --port 8001
```

Visit <http://localhost:8001/docs> — you should see the auto-generated Swagger UI with every endpoint.

### 2. Frontend

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:

```
VITE_API_URL=http://localhost:8001
```

Run the dev server:

```powershell
npm run dev
```

Open the URL Vite prints (default <http://localhost:5173>).

### 3. Production build (frontend)

```powershell
npm run build
npm run preview
```

---

## Configuration

### Backend env vars

| Var | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` | *(empty)* | Required for any LLM call. Without it the app still boots and degrades gracefully. |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Override to test other Groq-hosted models. |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Comma-separated list. Localhost ports 3000/5173 are auto-allowed in dev regardless. |

### Frontend env vars

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8001` | Backend base URL. Vite requires the `VITE_` prefix to expose it to the client. |

---

## API reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check. Returns `{ "status": "ok" }`. |
| `POST` | `/upload-resume` | Multipart upload → returns `{ resume_text, resume_summary, chars }`. Best-effort LLM analysis. |
| `POST` | `/parse-jd` | JSON `{ jd_text }` → returns `{ jd_text, jd_summary, chars }`. |
| `POST` | `/suggest-topics` | JSON `{ role, mode, resume_summary?, jd_summary? }` → returns `{ topics: string[] }`. |
| `POST` | `/start` | Creates a session, returns first question + topic + UUID. |
| `POST` | `/answer` | Evaluates answer, returns feedback + score + next question or final report. |
| `GET` | `/report/{session_id}` | Re-fetch the final report after a session ends. |

Full schema is auto-generated at `/docs` (Swagger UI) and `/redoc`.

---

## Interview modes

| Mode | Strategy | Context required |
|---|---|---|
| `quick` | Generic technical practice on chosen topics. | Role + topics. |
| `technical` | Deeper technical grilling on chosen topics. | Role + topics. |
| `resume_driven` | Probes specific projects/skills from your resume. | Resume upload. |
| `jd_targeted` | Mirrors the JD's must-haves and seniority. | Pasted JD. |
| `hr_behavioral` | **Strictly** behavioral / situational / motivational. No coding, no syntax, no system-design as a knowledge question — even technical-sounding topics get reframed (e.g. "System Design" → "tell me about a time you influenced an architectural decision"). | Role + topics. |

Mode rules are enforced in [backend/prompts.py](backend/prompts.py) under `QUESTION_PROMPT` → "CRITICAL — mode rules". Per-mode isolation also lives on the frontend ([SetupScreen.jsx](frontend/src/pages/SetupScreen.jsx)) — only the context the active mode needs is forwarded to `/start`, so a stale resume from a previous session never bleeds into a Quick or HR run.

---

## LangGraph state machine

```
                            ┌─────────────────────┐
                            │  generate_question  │ ◄────────────┐
                            └──────────┬──────────┘              │
                                       │ (waits for /answer)     │
                                       ▼                         │
                            ┌─────────────────────┐              │
                            │   evaluate_answer   │              │
                            └──────────┬──────────┘              │
                                       │ route_decision()        │
                  ┌────────────────────┼────────────────────┐    │
                  ▼                    ▼                    ▼    │
        score < 6 & follows<2   topic_index+1 <      else (last  │
                                total_topics          topic done)│
                  │                    │                    │    │
                  ▼                    ▼                    ▼    │
        ┌───────────────────┐ ┌────────────────────┐ ┌─────────┐ │
        │   bump_followup   │ │ record_and_advance │ │ wrap_up │ │
        └─────────┬─────────┘ └──────────┬─────────┘ │ _report │ │
                  └────────────┬─────────┘           └────┬────┘ │
                               └─────────────────────────►│      │
                                                          ▼      │
                                                         END     │
                                                                 │
                  (loop iteration: generate_question for new turn)
```

Key decision: instead of running `compiled_graph.invoke()` in one go, the FastAPI layer drives nodes **manually** between `/start` and each `/answer`. That's the only way to inject the candidate's typed answer mid-graph in a stateless HTTP world. See [EXPLANATION.md → §LangGraph](./EXPLANATION.md#langgraph-the-heart-of-the-backend) for the full rationale.

---

## Frontend architecture

- **`App.jsx`** owns the global session state via `InterviewContext`: `session`, `setupConfig`, `finalReport`, `resumeData`, `jdData`. `reset()` wipes everything when an interview ends so context cannot leak into the next session.
- **Layouts**: marketing pages share a `MarketingLayout` (Navbar + Footer + `<Outlet />`); `/interview` and `/report` render full-screen.
- **`SetupScreen.jsx`**: mode picker → drag-drop resume / JD paste → role + topics → voice settings → submit. Shows a 4-dot step bar that progresses as the user fills the form.
- **`InterviewScreen.jsx`**: sticky topbar (mode, role, topic, progress, elapsed, live status dot) + 3-column body (avatar+tips on the left, chat with internal scroll in the centre, score sidebar on the right). Page-level overflow is hidden — only the chat scrolls, so the input never gets pushed off-screen.
- **`ReportScreen.jsx`**: final card grid — overall score, grade, fit summary, per-topic breakdown, strengths, weaknesses, action plan with concrete resources.

CSS Modules give us scoped class names without a build-step config. Design tokens live in `frontend/src/styles/global.css` (CSS variables for colours, radius, shadow).

---

## Voice (Web Speech API)

- **Speech-to-text** ([useSpeechRecognition.js](frontend/src/hooks/useSpeechRecognition.js)) — uses `SpeechRecognition` / `webkitSpeechRecognition`, continuous mode with interim results, English (India) locale, with friendly errors for `not-allowed` and `no-speech`.
- **Text-to-speech** ([useSpeechSynthesis.js](frontend/src/hooks/useSpeechSynthesis.js)) — uses `SpeechSynthesisUtterance`, prefers a Google English voice, gracefully falls back to any English voice. Defers `speak()` by 60 ms after `cancel()` to dodge a Chrome bug that drops the very first utterance.
- **First-question fix** ([InterviewScreen.jsx](frontend/src/pages/InterviewScreen.jsx)) — if `voicesReady` is false on session start, the question is queued in a ref and spoken as soon as the `voiceschanged` event fires.

Works best in Chrome and Edge. Firefox lacks `SpeechRecognition`; Safari has TTS but flaky STT.

---

## Resilience & error handling

The backend is built so that **a missing or rate-limited LLM never crashes the app**:

- [backend/llm.py](backend/llm.py) wraps every Groq call in `try/except`. `call_llm()` returns `""` on failure; `call_llm_json()` returns `None`. No exception escapes.
- `call_llm_json()` retries once with a stricter "JSON only" suffix before giving up.
- Every node in [backend/graph.py](backend/graph.py) defends against `None` results — e.g. `evaluate_answer` falls back to a mid-score (5) if the LLM can't be reached.
- [backend/server.py](backend/server.py) has a global `Exception` handler so 500s still return a JSON body with the right CORS headers — without it, a raw exception bypasses the CORS middleware and the browser shows a misleading "CORS policy" error.
- Resume analysis is **best-effort** — if Groq is misconfigured, the resume text is still extracted and returned; only `resume_summary` ends up empty.

Frontend mirrors this: every API call has retry/error UI, the chat shows the user a clear retry button, and toasts surface mic errors without breaking the session.

---

## Privacy & data handling

- Resumes are processed **in memory** and never written to disk.
- Sessions live in a process dict; restarting the server wipes everything.
- No analytics, no tracking, no third-party requests beyond the Groq API.
- The Groq API call sends prompt text only; no resume binary is uploaded externally.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `404 (Not Found)` on `/upload-resume` | `VITE_API_URL` points to wrong port | Match it to the Uvicorn port (default `8001`). |
| `CORS policy: No 'Access-Control-Allow-Origin'` | Backend crashed mid-request and the raw 500 bypassed CORS | Check `backend/server.log`. The global handler should now return a clean JSON 500; the actual cause is usually a missing `GROQ_API_KEY`. |
| Resume parsed but summary is empty | `GROQ_API_KEY` missing or invalid | Set the key in `backend/.env` and restart Uvicorn. |
| AI doesn't speak the first question | Browser hadn't loaded voices yet | Already mitigated — the first question is queued until `voicesReady` flips true. If still silent, check that voice mode is on in the setup screen. |
| Mic stays grey / never starts | Browser denied microphone | Allow mic for `localhost` in browser site settings; reload. |
| `415 Unsupported Media Type` on resume upload | File extension not in `.pdf / .docx / .doc / .txt` | Re-export your resume as PDF. |

---

## Roadmap

- Persistent sessions (Redis or SQLite) so refreshes don't drop progress
- Optional auth + per-user history
- Per-mode prompt experimentation framework (A/B compare prompts)
- Whisper-based server-side STT for browsers without `SpeechRecognition`
- Export final report as a styled PDF
- Configurable interviewer "persona" (FAANG, startup, big-bank, etc.)

---

## License

MIT — fork it, run it, ship it. The Groq API has its own free-tier terms; check those before deploying publicly.
