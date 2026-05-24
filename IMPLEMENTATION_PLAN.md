# Implementation Plan — Adaptive Mock Interview Coach
**Version:** 2.0.0 (Gap-patched — supersedes v1.0.0)
**Source PRD:** `InterviewCoach_PRD.docx` (v1.0.0)
**Stack:** Python 3.11+ · LangGraph · FastAPI · React 18 · Groq (Llama 3.1 70B) · Web Speech API
**Deployment:** Render (backend) · Vercel (frontend) · GitHub (repo)
**Cost:** ₹0 / $0 — Completely Free

> **What changed from v1.0.0:**
> Five gaps found during PRD audit have been patched in this version.
> (1) F-012 progress bar added as a dedicated component.
> (2) `interview_type` wired into prompts properly.
> (3) Topic count conflict resolved — maximum is 4 (per PRD §4.1).
> (4) `voice_enabled` and `speech_rate` added to StartRequest/StartResponse.
> (5) Firebase → Vercel formally recorded as a scope decision.
> (6) Mobile responsiveness given a dedicated task.
> (7) "Share on LinkedIn" optional button included in M7.

---

## 1. Architecture at a Glance

```
┌──────────────────────────────────┐         ┌──────────────────────────────────┐
│  React 18 Frontend               │  HTTP   │  FastAPI Backend                 │
│  (Vercel — free tier)            │ ──────► │  (Render — free tier)            │
│                                  │         │                                  │
│  • Web Speech API (STT)          │ ◄────── │  • LangGraph state graph         │
│  • Web Speech Synthesis (TTS)    │  JSON   │  • In-process session dict       │
│  • Avatar / Chat / Score Sidebar │         │  • Groq Llama 3.1 70B via        │
│  • Progress bar                  │         │    langchain-groq                 │
└──────────────────────────────────┘         └──────────────────────────────────┘
```

**Session model:** `session_id` (uuid4) is issued on `POST /start` and reused on every `POST /answer` to look up the in-process `InterviewState` dictionary. No database in MVP — state lives in a plain Python dict (`sessions: dict[str, InterviewState]`). LangGraph's `MemorySaver` is used for state shape validation and checkpointing ergonomics, not for HTTP-level interrupts (see §4 M2 design decision). On server restart sessions are lost; this is acceptable per PRD §13.

**Deployment decision (scope change from PRD §2.3):** PRD specifies Firebase for the frontend. This plan uses **Vercel** instead. Reason: Vercel has zero-config Create React App support, automatic HTTPS, and branch previews — all free. Firebase Hosting requires the Firebase CLI and a Google project, adding unnecessary setup friction for a solo MVP. This is a deployment-only change; no product behaviour is affected.

---

## 2. Repository Layout

```
InterviewCoach/
├── backend/
│   ├── graph.py          ← LangGraph state + nodes + edges
│   ├── server.py         ← FastAPI app + all endpoints
│   ├── prompts.py        ← All 4 LLM prompt templates
│   ├── models.py         ← Pydantic request / response models
│   ├── llm.py            ← Groq client singleton + JSON-parse helper
│   ├── requirements.txt  ← pip freeze output
│   ├── .env              ← GROQ_API_KEY (gitignored — NEVER commit)
│   └── .env.example      ← GROQ_API_KEY= (committed, key blank)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── SetupScreen.jsx
│   │   │   ├── InterviewScreen.jsx
│   │   │   └── ReportScreen.jsx
│   │   ├── components/
│   │   │   ├── AiAvatar.jsx          ← Animated waveform
│   │   │   ├── ChatWindow.jsx        ← Message bubbles
│   │   │   ├── VoiceInput.jsx        ← Mic button + transcript area
│   │   │   ├── ScoreSidebar.jsx      ← Live score tracker
│   │   │   ├── ProgressBar.jsx       ← F-012: topic step progress bar
│   │   │   └── ReportCard.jsx        ← Final report UI
│   │   ├── hooks/
│   │   │   ├── useSpeechRecognition.js
│   │   │   └── useSpeechSynthesis.js
│   │   ├── api/
│   │   │   └── interviewApi.js       ← Axios calls to FastAPI
│   │   ├── data/
│   │   │   └── topics.js             ← Role → topics map (static)
│   │   ├── App.jsx                   ← Router + React Context
│   │   └── styles/
│   │       └── *.module.css
│   ├── .env.local         ← REACT_APP_API_URL (gitignored)
│   └── package.json
├── .gitignore             ← venv/, node_modules/, .env, .env.local,
│                             __pycache__/, build/, *.pyc
├── README.md
└── IMPLEMENTATION_PLAN.md ← this file
```

---

## 3. Resolved PRD Inconsistencies

Before coding starts, these contradictions in the PRD are resolved here so every milestone uses one consistent truth.

| # | Conflict | PRD says (location A) | PRD says (location B) | Resolution used in this plan |
|---|---|---|---|---|
| 1 | Max topics | "2–4 topics" (§4.1) | "min 2, max 5 topics" (§5.2.1) | **Max 4.** §4.1 is the user flow spec — it takes precedence. |
| 2 | `interview_type` in prompts | Field exists in state and StartRequest | None of the 4 prompt templates in §9 use it | **Wire it in.** QUESTION_PROMPT and FOLLOWUP_PROMPT receive `interview_type` as a parameter. See §6 below. |
| 3 | `voice_enabled` / `speech_rate` in API | Setup form collects both (§5.2.3) | StartRequest model omits both (§7.1) | **Add both to StartRequest and StartResponse.** Backend stores them in state; frontend reads them back. |
| 4 | Frontend deployment | Firebase (§2.3) | — | **Vercel.** Documented as a scope decision in §1. |

---

## 4. Milestones

Eight milestones, each ending with a runnable, demoable artifact. Do not move to the next milestone until the current exit criteria pass.

| # | Milestone | Outcome | Est. effort |
|---|---|---|---|
| M1 | Project scaffold + Groq smoke test | `python llm.py` prints a Llama completion | 0.5 day |
| M2 | LangGraph graph — CLI driver | `python graph.py` runs a full mock interview in terminal | 1.5 days |
| M3 | FastAPI server | `/start` and `/answer` verified in Swagger UI at `/docs` | 1 day |
| M4 | React scaffold + Landing + Setup screens | Setup form POSTs `/start` and routes to Interview screen | 1 day |
| M5 | Interview screen — text input only | Full interview playable end-to-end without voice | 1.5 days |
| M6 | Voice layer (STT + TTS + avatar) | Spoken interview with animated avatar | 1.5 days |
| M7 | Report screen + edge cases + polish | All acceptance criteria (PRD §12) green | 1 day |
| M8 | Deployment | Public URLs on Render + Vercel | 0.5 day |

**Total estimated effort:** ~8.5 days solo.

---

## 5. Milestone Details

---

### M1 — Project Scaffold + Groq Smoke Test

**Goal:** Prove the environment works and Groq is reachable before writing any graph logic.

**Tasks**

1. Create the folder structure from §2. Initialize git.

2. Create `.gitignore` with these entries:
   ```
   venv/
   node_modules/
   .env
   .env.local
   __pycache__/
   *.pyc
   build/
   dist/
   ```

3. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate        # Windows
   source venv/bin/activate     # Mac / Linux
   ```

4. Install all backend packages in one command:
   ```bash
   pip install langgraph langchain-groq langchain-core fastapi uvicorn python-dotenv pydantic
   ```

5. Save dependencies:
   ```bash
   pip freeze > backend/requirements.txt
   ```

6. Get a free API key from `console.groq.com`. Create `backend/.env`:
   ```
   GROQ_API_KEY=your_key_here
   ```
   Create `backend/.env.example`:
   ```
   GROQ_API_KEY=
   ```
   Commit `.env.example`. Never commit `.env`.

7. Build `backend/llm.py`:

   ```python
   # backend/llm.py
   import os, json, re
   from dotenv import load_dotenv
   from langchain_groq import ChatGroq
   from langchain_core.messages import HumanMessage

   load_dotenv()

   # Singleton Groq client — reused across all LLM calls
   _llm = ChatGroq(
       model="llama-3.1-70b-versatile",
       temperature=0.4,
       groq_api_key=os.getenv("GROQ_API_KEY")
   )

   def call_llm(prompt: str) -> str:
       """Plain text completion. Returns the string response."""
       response = _llm.invoke([HumanMessage(content=prompt)])
       return response.content.strip()

   def call_llm_json(prompt: str) -> dict:
       """
       Completion that must return a JSON object.
       Strategy:
         1. Strip ```json fences.
         2. Find first { and last } and parse that slice.
         3. On failure, retry once with a stricter prompt suffix.
         4. On second failure, return None and log raw output.
       """
       def _parse(text: str):
           text = re.sub(r"```json|```", "", text).strip()
           start = text.find("{")
           end   = text.rfind("}") + 1
           if start == -1 or end == 0:
               return None
           try:
               return json.loads(text[start:end])
           except json.JSONDecodeError:
               return None

       raw = call_llm(prompt)
       result = _parse(raw)
       if result is not None:
           return result

       # Retry once with explicit instruction
       strict_prompt = prompt + "\n\nIMPORTANT: Return ONLY the JSON object. No explanation. No markdown."
       raw2 = call_llm(strict_prompt)
       result2 = _parse(raw2)
       if result2 is not None:
           return result2

       print(f"[llm.py] JSON parse failed after retry. Raw output:\n{raw2}")
       return None

   if __name__ == "__main__":
       print(call_llm("Say hello in one sentence."))
   ```

**Exit criteria:** `python backend/llm.py` prints a non-empty sentence. No API key appears in any committed file.

---

### M2 — LangGraph Graph + CLI Driver

**Goal:** The full interview logic runs correctly in the terminal before any HTTP layer exists.

**Design decision — graph execution model:**

LangGraph's native `interrupt_before` pattern pauses graph execution mid-run waiting for external input. This is elegant but adds complexity when mapped to stateless HTTP calls. For this MVP we use a simpler **node-by-node invocation model**:

- `POST /start` runs only `generate_question` and returns.
- `POST /answer` runs `evaluate_answer` → `route_decision` → the next appropriate node (`generate_question` or `wrap_up_report`) and returns.
- State is stored in the backend's `sessions` dict between calls, not inside LangGraph's checkpointer mid-run.
- `graph.compile(checkpointer=MemorySaver())` is kept for state shape validation and future extensibility.

This is documented here so the decision is intentional, not an accident.

**Tasks**

1. Create `backend/prompts.py` with all four templates. Note the addition of `{interview_type}` to QUESTION_PROMPT and FOLLOWUP_PROMPT (patch for PRD inconsistency #2):

   ```python
   # backend/prompts.py

   QUESTION_PROMPT = """
   You are a strict but fair technical interviewer at a top tech company.
   You are interviewing a candidate for the role of: {role}.
   Interview type: {interview_type} (technical / behavioral / mixed).
   Current topic: {topic}.
   Difficulty: {difficulty}.

   Ask exactly ONE interview question about {topic}.
   The question should be {difficulty}-level.
   If interview type is 'behavioral', ask a situational / experience-based question.
   If interview type is 'technical', ask a technical concept or problem-solving question.
   If interview type is 'mixed', alternate based on what feels natural for the topic.

   Do NOT give hints. Do NOT ask multiple questions.
   Output only the question text — no preamble, no numbering.
   """

   FOLLOWUP_PROMPT = """
   You are a technical interviewer. The candidate gave a weak answer.
   Role: {role}.
   Interview type: {interview_type}.
   Original question: {question}
   Candidate's answer: {answer}
   Their answer scored {score}/10 because: {feedback}

   Ask ONE probing follow-up question targeting the specific gap in their answer.
   Match the interview type: {interview_type}.
   Output only the follow-up question — no preamble.
   """

   EVALUATE_PROMPT = """
   You are evaluating a candidate's answer in a technical interview.
   Role: {role}.
   Topic: {topic}.
   Question asked: {question}
   Candidate's answer: {answer}

   Evaluate strictly. Return ONLY valid JSON in this exact format:
   {{
     "score": <integer 1-10>,
     "feedback": "<2-3 sentence explanation of the score>"
   }}
   No other text. No markdown. Just the JSON object.
   """

   REPORT_PROMPT = """
   You just completed a mock interview for a {role} candidate.
   Topics covered: {topics}
   Scores per topic: {scores}
   Full Q&A transcript: {transcript}

   Generate a performance report. Return ONLY valid JSON:
   {{
     "overall_score": <float, average of scores>,
     "grade": "<A+|A|B|C|D>",
     "topic_breakdown": [{{"topic": "", "score": 0, "comment": ""}}],
     "strengths": ["<strength 1>", "<strength 2>"],
     "weaknesses": ["<weakness 1>", "<weakness 2>"],
     "action_plan": [
       {{"tip": "<specific actionable tip>", "resource": "<where to practice>"}}
     ]
   }}
   No other text. No markdown. Just the JSON.
   """
   ```

2. Create `backend/graph.py`:

   ```python
   # backend/graph.py
   # Execution model: node-by-node from API (see IMPLEMENTATION_PLAN.md §5 M2)

   from typing import TypedDict, List
   from langgraph.graph import StateGraph, END
   from langgraph.checkpoint.memory import MemorySaver
   from llm import call_llm, call_llm_json
   from prompts import QUESTION_PROMPT, FOLLOWUP_PROMPT, EVALUATE_PROMPT, REPORT_PROMPT

   # ── State ────────────────────────────────────────────────────────────────────

   class InterviewState(TypedDict):
       # Setup
       role:             str
       difficulty:       str
       topics:           List[str]
       interview_type:   str          # 'technical' | 'behavioral' | 'mixed'
       voice_enabled:    bool         # stored so frontend can read it back
       speech_rate:      float        # 0.7 | 1.0 | 1.3
       # Progress
       current_topic_index: int
       topics_done:      List[str]
       follow_up_count:  int
       # Current turn
       current_question: str
       current_answer:   str
       current_score:    int
       current_feedback: str
       # History
       scores:           List[int]
       messages:         List[dict]   # [{role: 'ai'|'user', content: str}]
       # Control
       next_action:      str          # 'ask_question'|'follow_up'|'next_topic'|'wrap_up'
       # Output
       final_report:     dict

   # ── Nodes ────────────────────────────────────────────────────────────────────

   def generate_question(state: InterviewState) -> dict:
       topic = state["topics"][state["current_topic_index"]]
       if state["follow_up_count"] == 0:
           prompt = QUESTION_PROMPT.format(
               role=state["role"],
               topic=topic,
               difficulty=state["difficulty"],
               interview_type=state["interview_type"],
           )
       else:
           prompt = FOLLOWUP_PROMPT.format(
               role=state["role"],
               topic=topic,
               interview_type=state["interview_type"],
               question=state["current_question"],
               answer=state["current_answer"],
               score=state["current_score"],
               feedback=state["current_feedback"],
           )
       question = call_llm(prompt)
       return {"current_question": question}

   def evaluate_answer(state: InterviewState) -> dict:
       topic = state["topics"][state["current_topic_index"]]
       prompt = EVALUATE_PROMPT.format(
           role=state["role"],
           topic=topic,
           question=state["current_question"],
           answer=state["current_answer"],
       )
       result = call_llm_json(prompt)
       if result is None:
           result = {"score": 5, "feedback": "Could not evaluate answer — defaulting to mid-score."}
       return {
           "current_score":    result.get("score", 5),
           "current_feedback": result.get("feedback", "No feedback available."),
       }

   def route_decision(state: InterviewState) -> str:
       """Pure Python conditional edge — no LLM call."""
       score         = state["current_score"]
       follow_ups    = state["follow_up_count"]
       current_idx   = state["current_topic_index"]
       total_topics  = len(state["topics"])

       if score < 6 and follow_ups < 2:
           return "follow_up"
       if current_idx + 1 < total_topics:
           return "next_topic"
       return "wrap_up"

   def record_and_advance(state: InterviewState) -> dict:
       topic = state["topics"][state["current_topic_index"]]
       new_scores   = state["scores"] + [state["current_score"]]
       new_messages = state["messages"] + [
           {"role": "ai",   "content": state["current_question"]},
           {"role": "user", "content": state["current_answer"]},
           {"role": "feedback", "content": state["current_feedback"]},
       ]
       new_topics_done = state["topics_done"] + [topic]
       return {
           "scores":              new_scores,
           "messages":            new_messages,
           "topics_done":         new_topics_done,
           "follow_up_count":     0,
           "current_topic_index": state["current_topic_index"] + 1,
       }

   def bump_followup(state: InterviewState) -> dict:
       """Increments follow_up_count before re-entering generate_question."""
       return {"follow_up_count": state["follow_up_count"] + 1}

   def wrap_up_report(state: InterviewState) -> dict:
       transcript_text = "\n".join(
           f"{m['role'].upper()}: {m['content']}" for m in state["messages"]
       )
       topic_score_pairs = list(zip(state["topics_done"], state["scores"]))
       prompt = REPORT_PROMPT.format(
           role=state["role"],
           topics=", ".join(state["topics"]),
           scores=str(topic_score_pairs),
           transcript=transcript_text,
       )
       report = call_llm_json(prompt)
       if report is None:
           avg = round(sum(state["scores"]) / len(state["scores"]), 1) if state["scores"] else 0
           report = {
               "overall_score": avg,
               "grade": "B",
               "topic_breakdown": [],
               "strengths": ["Could not generate strengths."],
               "weaknesses": ["Could not generate weaknesses."],
               "action_plan": [{"tip": "Review your weakest topic.", "resource": "docs.python.org"}],
           }
       return {"final_report": report}

   # ── Graph Wiring ─────────────────────────────────────────────────────────────

   graph = StateGraph(InterviewState)

   graph.add_node("generate_question", generate_question)
   graph.add_node("evaluate_answer",   evaluate_answer)
   graph.add_node("record_and_advance", record_and_advance)
   graph.add_node("bump_followup",     bump_followup)
   graph.add_node("wrap_up_report",    wrap_up_report)

   graph.set_entry_point("generate_question")

   graph.add_edge("generate_question", "evaluate_answer")  # waits for user answer externally

   graph.add_conditional_edges(
       "evaluate_answer",
       route_decision,
       {
           "follow_up":  "bump_followup",
           "next_topic": "record_and_advance",
           "wrap_up":    "wrap_up_report",
       }
   )

   graph.add_edge("bump_followup",      "generate_question")
   graph.add_edge("record_and_advance", "generate_question")
   graph.add_edge("wrap_up_report",     END)

   compiled_graph = graph.compile(checkpointer=MemorySaver())

   # ── CLI Driver (for testing without API) ─────────────────────────────────────

   if __name__ == "__main__":
       import pprint
       state: InterviewState = {
           "role": "Python Developer",
           "difficulty": "intermediate",
           "topics": ["Core Python", "OOP"],
           "interview_type": "technical",
           "voice_enabled": False,
           "speech_rate": 1.0,
           "current_topic_index": 0,
           "topics_done": [],
           "follow_up_count": 0,
           "current_question": "",
           "current_answer": "",
           "current_score": 0,
           "current_feedback": "",
           "scores": [],
           "messages": [],
           "next_action": "ask_question",
           "final_report": {},
       }

       # Step 1: Generate first question
       state.update(generate_question(state))
       print(f"\nAI: {state['current_question']}\n")

       while not state.get("final_report"):
           answer = input("You: ").strip()
           if not answer:
               continue
           state["current_answer"] = answer

           # Evaluate
           state.update(evaluate_answer(state))
           print(f"\n[Score: {state['current_score']}/10] {state['current_feedback']}\n")

           decision = route_decision(state)

           if decision == "follow_up":
               state.update(bump_followup(state))
               state.update(generate_question(state))
               print(f"AI (follow-up): {state['current_question']}\n")
           elif decision == "next_topic":
               state.update(record_and_advance(state))
               if state["current_topic_index"] < len(state["topics"]):
                   state.update(generate_question(state))
                   current_topic = state["topics"][state["current_topic_index"]]
                   print(f"\n--- Moving to: {current_topic} ---\n")
                   print(f"AI: {state['current_question']}\n")
           elif decision == "wrap_up":
               state.update(record_and_advance(state))
               state.update(wrap_up_report(state))
               print("\n===== FINAL REPORT =====")
               pprint.pprint(state["final_report"])
   ```

**Exit criteria:** `python backend/graph.py` runs a full 2-topic interview in the terminal and prints a JSON report at the end.

---

### M3 — FastAPI Server

**Goal:** The two core endpoints work and are verifiable in Swagger UI without any frontend.

**Tasks**

1. Create `backend/models.py`:

   ```python
   # backend/models.py
   from pydantic import BaseModel
   from typing import List, Optional

   class StartRequest(BaseModel):
       role:           str
       difficulty:     str
       topics:         List[str]
       interview_type: str
       voice_enabled:  bool    # patch: added from PRD §5.2.3
       speech_rate:    float   # patch: added from PRD §5.2.3

   class StartResponse(BaseModel):
       session_id:   str
       question:     str
       topic:        str
       topic_index:  int
       total_topics: int
       voice_enabled: bool     # sent back so frontend can read from response
       speech_rate:   float

   class AnswerRequest(BaseModel):
       session_id: str
       answer:     str

   class AnswerResponse(BaseModel):
       feedback:      str
       score:         int
       next_question: Optional[str] = None
       next_topic:    Optional[str] = None
       topic_changed: bool
       is_done:       bool
       final_report:  Optional[dict] = None

   class ReportResponse(BaseModel):
       final_report: dict

   class HealthResponse(BaseModel):
       status: str
   ```

2. Create `backend/server.py`:

   ```python
   # backend/server.py
   import os, uuid
   from dotenv import load_dotenv
   from fastapi import FastAPI, HTTPException
   from fastapi.middleware.cors import CORSMiddleware
   from models import (StartRequest, StartResponse, AnswerRequest,
                       AnswerResponse, ReportResponse, HealthResponse)
   from graph import (InterviewState, generate_question, evaluate_answer,
                      route_decision, record_and_advance, bump_followup,
                      wrap_up_report)

   load_dotenv()

   app = FastAPI(title="Interview Coach API", version="1.0.0")

   # CORS — allow localhost dev and the future Vercel URL
   ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:3000")
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[ALLOWED_ORIGIN],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

   # In-process session store — lost on restart (acceptable per PRD §13)
   sessions: dict[str, InterviewState] = {}

   # ── Endpoints ────────────────────────────────────────────────────────────────

   @app.get("/health", response_model=HealthResponse)
   def health():
       return {"status": "ok"}

   @app.post("/start", response_model=StartResponse)
   def start_interview(payload: StartRequest):
       # Validate topic count (resolved PRD inconsistency: max 4)
       if not (2 <= len(payload.topics) <= 4):
           raise HTTPException(status_code=422, detail="Select between 2 and 4 topics.")

       session_id = str(uuid.uuid4())

       state: InterviewState = {
           "role":                  payload.role,
           "difficulty":            payload.difficulty,
           "topics":                payload.topics,
           "interview_type":        payload.interview_type,
           "voice_enabled":         payload.voice_enabled,
           "speech_rate":           payload.speech_rate,
           "current_topic_index":   0,
           "topics_done":           [],
           "follow_up_count":       0,
           "current_question":      "",
           "current_answer":        "",
           "current_score":         0,
           "current_feedback":      "",
           "scores":                [],
           "messages":              [],
           "next_action":           "ask_question",
           "final_report":          {},
       }

       state.update(generate_question(state))
       sessions[session_id] = state

       return StartResponse(
           session_id=session_id,
           question=state["current_question"],
           topic=state["topics"][0],
           topic_index=0,
           total_topics=len(state["topics"]),
           voice_enabled=state["voice_enabled"],
           speech_rate=state["speech_rate"],
       )

   @app.post("/answer", response_model=AnswerResponse)
   def submit_answer(payload: AnswerRequest):
       state = sessions.get(payload.session_id)
       if not state:
           raise HTTPException(status_code=404, detail="Session not found. It may have expired.")

       if not payload.answer.strip():
           raise HTTPException(status_code=422, detail="Answer cannot be empty.")

       state["current_answer"] = payload.answer.strip()
       state.update(evaluate_answer(state))

       decision      = route_decision(state)
       topic_changed = False
       is_done       = False

       if decision == "follow_up":
           state.update(bump_followup(state))
           state.update(generate_question(state))

       elif decision == "next_topic":
           state.update(record_and_advance(state))
           topic_changed = True
           state.update(generate_question(state))

       elif decision == "wrap_up":
           state.update(record_and_advance(state))
           state.update(wrap_up_report(state))
           is_done = True

       sessions[payload.session_id] = state

       next_topic = None
       if topic_changed and not is_done:
           next_topic = state["topics"][state["current_topic_index"]]

       return AnswerResponse(
           feedback=state["current_feedback"],
           score=state["current_score"],
           next_question=None if is_done else state["current_question"],
           next_topic=next_topic,
           topic_changed=topic_changed,
           is_done=is_done,
           final_report=state["final_report"] if is_done else None,
       )

   @app.get("/report/{session_id}", response_model=ReportResponse)
   def get_report(session_id: str):
       state = sessions.get(session_id)
       if not state or not state.get("final_report"):
           raise HTTPException(status_code=404, detail="Report not found.")
       return ReportResponse(final_report=state["final_report"])
   ```

3. Run the server:
   ```bash
   cd backend
   uvicorn server:app --reload --port 8001
   ```

**Exit criteria:** Open `http://localhost:8001/docs`. Manually run `POST /start`, then several `POST /answer` calls. Confirm: scores update, follow-ups trigger when score < 6, `is_done: true` arrives with a non-empty `final_report` after all topics.

---

### M4 — React Scaffold + Landing + Setup Screens

**Goal:** A user can fill the setup form and reach the Interview screen with the first question loaded.

**Tasks**

1. Scaffold and install:
   ```bash
   cd ..
   npx create-react-app frontend
   cd frontend
   npm install axios react-router-dom
   ```

2. Create `frontend/.env.local`:
   ```
   REACT_APP_API_URL=http://localhost:8001
   ```

3. Create `frontend/src/data/topics.js` — the role-to-topics map:
   ```js
   // frontend/src/data/topics.js
   export const ROLE_TOPICS = {
     "Python Developer":           ["Core Python", "OOP", "APIs & REST", "Databases", "System Design", "Behavioral"],
     "Frontend Developer":         ["HTML & CSS", "JavaScript", "React", "Performance", "Accessibility", "Behavioral"],
     "Data Scientist":             ["Statistics", "Python for Data", "Machine Learning", "SQL", "Data Visualization", "Behavioral"],
     "Backend Developer":          ["System Design", "Databases", "APIs & REST", "Caching", "Security", "Behavioral"],
     "Full Stack Developer":       ["JavaScript", "React", "Node.js", "Databases", "System Design", "Behavioral"],
     "DevOps Engineer":            ["CI/CD", "Docker & Kubernetes", "Cloud (AWS/GCP)", "Monitoring", "Linux", "Behavioral"],
     "Machine Learning Engineer":  ["ML Algorithms", "Deep Learning", "Python for ML", "MLOps", "System Design", "Behavioral"],
   };

   export const ROLES = Object.keys(ROLE_TOPICS);
   ```

4. Create `frontend/src/api/interviewApi.js`:
   ```js
   // frontend/src/api/interviewApi.js
   import axios from "axios";

   const api = axios.create({
     baseURL: process.env.REACT_APP_API_URL,
     timeout: 15000,  // 15s covers Render cold starts
   });

   export const startInterview = (payload) => api.post("/start", payload);
   export const submitAnswer   = (session_id, answer) => api.post("/answer", { session_id, answer });
   export const getReport      = (session_id) => api.get(`/report/${session_id}`);
   ```

5. Create `frontend/src/App.jsx` — router + shared context:
   ```jsx
   // frontend/src/App.jsx
   import React, { createContext, useContext, useState } from "react";
   import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
   import LandingPage     from "./pages/LandingPage";
   import SetupScreen     from "./pages/SetupScreen";
   import InterviewScreen from "./pages/InterviewScreen";
   import ReportScreen    from "./pages/ReportScreen";

   export const InterviewContext = createContext(null);
   export const useInterview = () => useContext(InterviewContext);

   export default function App() {
     const [session, setSession] = useState(null);
     // session shape: { sessionId, question, topic, topicIndex, totalTopics,
     //                  voiceEnabled, speechRate, liveScores, setupConfig }

     return (
       <InterviewContext.Provider value={{ session, setSession }}>
         <BrowserRouter>
           <Routes>
             <Route path="/"          element={<LandingPage />} />
             <Route path="/setup"     element={<SetupScreen />} />
             <Route path="/interview" element={session ? <InterviewScreen /> : <Navigate to="/" />} />
             <Route path="/report"    element={session?.finalReport ? <ReportScreen /> : <Navigate to="/" />} />
           </Routes>
         </BrowserRouter>
       </InterviewContext.Provider>
     );
   }
   ```

6. Build `LandingPage.jsx` — static, single CTA button to `/setup`. Matches PRD §5.1 (app name, tagline, 3 feature cards, "How it works" steps).

7. Build `SetupScreen.jsx` per PRD §5.2:
   - Role dropdown → populates topics checkboxes from `ROLE_TOPICS`.
   - Difficulty radio buttons (Beginner / Intermediate / Advanced).
   - Interview Type radio buttons (Technical Only / Behavioral Only / Mixed). Default: Mixed.
   - Topic checkboxes: min 2, max 4. Show inline error if fewer than 2 are checked.
   - Voice Mode toggle: feature-detect `window.SpeechRecognition || window.webkitSpeechRecognition`. If absent, force OFF, disable toggle, show note: "Voice requires Chrome browser."
   - Interviewer Speed slider: three stops — Slow (0.7), Normal (1.0), Fast (1.3). Display current label next to slider.
   - Begin Interview button: disabled and grayed out until validation passes (≥2 topics selected).
   - On submit:
     1. Show spinner on button.
     2. Call `startInterview({ role, difficulty, topics, interview_type, voice_enabled, speech_rate })`.
     3. On success: store full response in context (`setSession`), navigate to `/interview`.
     4. On error: show error toast, keep user on setup screen.

**Exit criteria:** Form validates, spinner appears on submit, `POST /start` succeeds, and user reaches `/interview` with the first question available in context.

---

### M5 — Interview Screen (Text Input Only)

**Goal:** A complete interview is playable end-to-end by typing — no voice yet.

**Tasks**

1. Build `InterviewScreen.jsx` — three-panel flex layout:
   - Left panel: `<AiAvatar />` (static in M5, animated in M6).
   - Center panel: `<ChatWindow />` + bottom `<VoiceInput />`.
   - Right panel: `<ScoreSidebar />`.
   - Mobile (<768px): stack vertically; sidebar collapses behind a button toggle.
   - **Mobile responsiveness task:** Use CSS flexbox/grid with `flex-direction: column` at `@media (max-width: 768px)`. Sidebar becomes a drawer toggled by a "Scores" button. Test this explicitly before moving to M6.

2. Build `ChatWindow.jsx`:
   - Message list with four bubble variants: `ai`, `user`, `feedback`, `system`.
   - `ai`: left-aligned, purple background, AI icon.
   - `user`: right-aligned, dark navy background, user icon.
   - `feedback`: left-aligned, teal accent (positive), amber (neutral), red (negative) based on score.
   - `system`: centered muted text, e.g., "Moving to next topic: Databases".
   - Auto-scroll to bottom on every new message using `useRef` + `scrollIntoView({ behavior: "smooth" })`.

3. Build `ScoreSidebar.jsx`:
   - Header: "Your Progress".
   - **Topic list:** Each topic as a row with topic name + score badge.
     - Gray = not yet attempted.
     - Red = score 1–4.
     - Amber = score 5–7.
     - Green = score 8–10.
   - Highlight current topic with a left border accent.
   - Below topic list: "Overall Score" — running average of scores so far.

4. Build `ProgressBar.jsx` — **F-012 (must-have, was missing from v1.0.0):**
   ```jsx
   // frontend/src/components/ProgressBar.jsx
   // A step-based progress bar showing topics done vs remaining.
   // Props: topics (string[]), currentIndex (number), scores (number[])
   export default function ProgressBar({ topics, currentIndex, scores }) {
     return (
       <div className={styles.progressWrap} role="progressbar"
            aria-valuenow={currentIndex} aria-valuemax={topics.length}
            aria-label={`Topic ${currentIndex} of ${topics.length} completed`}>
         {topics.map((topic, i) => {
           const done    = i < currentIndex;
           const active  = i === currentIndex;
           const score   = scores[i];
           let dotClass  = styles.dotFuture;
           if (done)   dotClass = score >= 8 ? styles.dotGreen : score >= 5 ? styles.dotAmber : styles.dotRed;
           if (active) dotClass = styles.dotActive;
           return (
             <React.Fragment key={topic}>
               <div className={styles.step}>
                 <div className={`${styles.dot} ${dotClass}`}>
                   {done ? (score >= 8 ? "✓" : score >= 5 ? "~" : "✗") : i + 1}
                 </div>
                 <span className={styles.stepLabel}>{topic}</span>
               </div>
               {i < topics.length - 1 && (
                 <div className={`${styles.connector} ${done ? styles.connectorDone : ""}`} />
               )}
             </React.Fragment>
           );
         })}
       </div>
     );
   }
   ```
   Place `<ProgressBar />` at the top of `InterviewScreen.jsx`, spanning all three columns.

5. Build `VoiceInput.jsx` — in M5, render a plain `<textarea>` + Submit button. The `voiceEnabled` prop controls whether mic UI appears (added in M6). Disable submit when textarea is empty.

6. Wire the submit flow in `InterviewScreen.jsx`:
   - On submit: show "AI is evaluating..." spinner, disable all inputs.
   - Call `submitAnswer(sessionId, answer)`.
   - On response:
     - Append feedback bubble to chat.
     - If `topic_changed: true`, append system bubble "Moving to: {next_topic}".
     - Update `liveScores` in context → sidebar and progress bar re-render.
     - Append next AI question bubble.
     - If `is_done: true`, store `final_report` in context, navigate to `/report`.
   - On 504/timeout: show inline retry banner with a Retry button.

**Exit criteria:** Full 2-topic interview playable by typing. Sidebar updates each turn with correct colors. Progress bar advances and colors correctly. Follow-ups appear when score < 6. Report screen is reachable.

---

### M6 — Voice Layer (STT + TTS + Avatar)

**Goal:** The full happy path from PRD §4.1 works with voice input and spoken AI questions.

**Tasks**

1. Create `frontend/src/hooks/useSpeechRecognition.js`:
   ```js
   import { useState, useRef } from "react";

   export function useSpeechRecognition() {
     const [transcript, setTranscript]   = useState("");
     const [isListening, setIsListening] = useState(false);
     const recognitionRef = useRef(null);

     const startListening = () => {
       const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
       if (!SR) {
         alert("Voice input requires Chrome or Edge.");
         return;
       }
       setTranscript("");                      // clear previous transcript
       const recognition = new SR();
       recognition.continuous     = true;
       recognition.interimResults = true;
       recognition.lang           = "en-IN";
       recognition.onresult = (e) => {
         const text = Array.from(e.results).map(r => r[0].transcript).join("");
         setTranscript(text);
       };
       recognition.onerror = () => setIsListening(false);
       recognition.onend   = () => setIsListening(false);
       recognition.start();
       recognitionRef.current = recognition;
       setIsListening(true);
     };

     const stopListening = () => {
       recognitionRef.current?.stop();
       setIsListening(false);
     };

     return { transcript, isListening, startListening, stopListening, setTranscript };
   }
   ```

2. Create `frontend/src/hooks/useSpeechSynthesis.js`:
   ```js
   import { useState, useEffect } from "react";

   export function useSpeechSynthesis() {
     const [isSpeaking, setIsSpeaking] = useState(false);
     const [voices, setVoices]         = useState([]);

     // Async voice loading — voices are not available synchronously on first load
     useEffect(() => {
       const load = () => setVoices(window.speechSynthesis.getVoices());
       load();
       window.speechSynthesis.onvoiceschanged = load;
       return () => { window.speechSynthesis.onvoiceschanged = null; };
     }, []);

     const speak = (text, rate = 1.0, onEnd = () => {}) => {
       window.speechSynthesis.cancel();
       const utterance    = new SpeechSynthesisUtterance(text);
       utterance.rate     = rate;
       utterance.pitch    = 1.0;
       utterance.lang     = "en-US";
       const preferred    = voices.find(v => v.name.includes("Google") && v.lang === "en-US");
       if (preferred) utterance.voice = preferred;
       utterance.onstart  = () => setIsSpeaking(true);
       utterance.onend    = () => { setIsSpeaking(false); onEnd(); };
       utterance.onerror  = () => { setIsSpeaking(false); onEnd(); };
       window.speechSynthesis.speak(utterance);
     };

     const stopSpeaking = () => {
       window.speechSynthesis.cancel();
       setIsSpeaking(false);
     };

     return { isSpeaking, speak, stopSpeaking };
   }
   ```

3. Build `AiAvatar.jsx` + `AiAvatar.module.css`:
   - 5 vertical bars. When `isSpeaking` prop is `true`, add class `.speaking`.
   - Bars oscillate with staggered CSS `animation-delay` on `@keyframes wave`.
   - Colors: idle = muted gray. Speaking = `#7F77DD` (purple from PRD §5.3.1).
   - Status text below bars: "Waiting for you..." (idle) / "Interviewer is speaking..." (speaking).

4. Update `InterviewScreen.jsx` for voice:
   - Import both hooks.
   - On every new AI question: if `voiceEnabled`, call `speak(question, speechRate, onEnd)`. In `onEnd`, enable the mic button.
   - While `isSpeaking`: disable mic button and answer area. Show "AI is speaking...".
   - Update `VoiceInput.jsx`: when `voiceEnabled` prop is true, show the mic button. Tap to start listening, tap again to stop. Show animated red dot while listening. Live transcript appears in the textarea in real time and is still editable before submit.

5. Permission and error UX:
   - `NotAllowedError` → banner: "Please allow microphone access in your browser settings."
   - Empty transcript on stop → toast: "Could not hear you. Try again or type your answer."

6. Cleanup on unmount:
   ```js
   useEffect(() => {
     return () => {
       window.speechSynthesis.cancel();
       recognitionRef.current?.stop();
     };
   }, []);
   ```
   This prevents overlapping voices when the user navigates away.

**Exit criteria:** Full PRD §4.1 happy path works. Avatar pulses while AI speaks. Mic activates after AI finishes. Live transcript appears. Score sidebar and progress bar update correctly after voice-submitted answers.

---

### M7 — Report Screen + Edge Cases + Polish

**Goal:** All 10 acceptance criteria in PRD §12 are demonstrably true.

**Tasks**

1. Build `ReportScreen.jsx` per PRD §5.4:
   - **Overall Grade** — large letter (A+/A/B/C/D) with color (green=A, amber=B/C, red=D). Score as X/10 below.
   - **Topic Breakdown** — table: topic, score badge, one-line comment.
   - **Strengths** — 2–3 bullet points.
   - **Areas to Improve** — 2–3 bullet points.
   - **Action Plan** — 3 specific tips each with a resource link.
   - **Interview Transcript** — collapsible section (click to expand/collapse) showing full Q&A.
   - **Try Again** button — resets context (`setSession(null)`), navigates to `/setup`.
   - **Copy Report** button — `navigator.clipboard.writeText(plainTextReport)` where `plainTextReport` is a formatted string of the report data.
   - **Share on LinkedIn** button (optional, per PRD §5.4.2) — opens `https://www.linkedin.com/sharing/share-offsite/?url=<your_vercel_url>` with a pre-filled status via URL params if LinkedIn's API supports it; otherwise a simple share link.

2. Walk through every row in PRD §4.2 edge cases and verify each renders correctly:

   | Scenario | Expected behaviour |
   |---|---|
   | Browser has no Web Speech API | Voice toggle disabled on setup; text-only mode forces on |
   | Microphone blocked | Banner shown; text input remains available |
   | Empty transcript on stop | Toast shown; mic reactivates |
   | Groq slow / timeout | 10s timeout fires; inline retry banner appears |
   | Blank answer submitted | Submit button disabled; no API call made |
   | Tab closed mid-interview | On reload, user lands on home screen (state is React-only) |
   | AI speaks but user can't hear | Question always visible as text in chat |

3. **Accessibility pass:**
   - Every voice cue has a visible text equivalent.
   - Keyboard focus order is logical (setup form → interview → report).
   - All icon-only buttons have `aria-label`.
   - Progress bar has `role="progressbar"` with `aria-valuenow` and `aria-valuemax`.
   - Score badges have `aria-label` describing the color meaning.

4. **Mobile responsiveness verification:**
   - Open Chrome DevTools, switch to mobile viewport (375px).
   - Three-panel layout stacks vertically. Sidebar is behind a "Scores" toggle button.
   - Progress bar wraps gracefully for 4 topics.
   - All buttons are tap-target size ≥ 44px.

5. Write the README per PRD §10 — include quick-start commands, a screenshot of each screen, and the public URLs (fill in after M8).

**Exit criteria:** All 10 items in PRD §12 are demonstrably true. App is fully keyboard navigable. Mobile layout renders without horizontal scroll.

---

### M8 — Deployment

**Goal:** Anyone can open a public URL in Chrome, complete an interview, and see a report.

**Tasks**

1. **Push to GitHub:**
   - Confirm `.env` and `.env.local` are NOT in the repository.
   - Confirm `backend/.env.example` IS in the repository (with blank key).
   - Push all code to a public GitHub repo.

2. **Backend → Render.com (free tier):**
   - New Web Service → connect GitHub repo.
   - Root directory: `backend/`.
   - Build command: `pip install -r requirements.txt`.
   - Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`.
   - Environment variables:
     ```
     GROQ_API_KEY=your_key
     ALLOWED_ORIGIN=https://your-app.vercel.app   ← fill after Vercel deploy
     ```
   - Deploy. Note the Render URL (e.g., `https://interview-coach.onrender.com`).

3. **Frontend → Vercel.com (free tier):**
   - Import GitHub repo.
   - Root directory: `frontend/`.
   - Environment variable:
     ```
     REACT_APP_API_URL=https://interview-coach.onrender.com
     ```
   - Deploy. Note the Vercel URL.

4. **Update Render `ALLOWED_ORIGIN`** with the final Vercel URL. Redeploy backend.

5. **Cold start UX:** Render free tier instances spin down after 15 minutes of inactivity and take ~30s to restart. On `POST /start`, if the response takes >3 seconds, show a banner: "Waking up the server — this takes about 30 seconds on first load. Hang tight!" Dismiss the banner on success.

6. **End-to-end smoke test on public URLs:**
   - Open the Vercel URL in Chrome (not localhost).
   - Complete a 2-topic interview by voice and by text.
   - Confirm the report card renders with grade, breakdown, and action plan.
   - Confirm copy-report works.

**Exit criteria:** Public Vercel URL is accessible. Complete interview works on public deployment. README has both public URLs and a 60-second demo GIF or video link.

---

## 6. Prompt Templates (Final — with `interview_type` patch)

These are the canonical templates to paste verbatim into `backend/prompts.py`. They fix PRD inconsistency #2 (`interview_type` was defined in state but unused in all prompts).

### Question Generation
```
QUESTION_PROMPT = """
You are a strict but fair technical interviewer at a top tech company.
Role: {role}. Interview type: {interview_type}. Topic: {topic}. Difficulty: {difficulty}.

Ask exactly ONE interview question about {topic} at {difficulty} level.
Match the interview type: technical → concept/problem-solving; behavioral → situation/experience.
Do NOT give hints. Do NOT ask multiple questions.
Output only the question — no preamble, no numbering.
"""
```

### Follow-Up
```
FOLLOWUP_PROMPT = """
You are a technical interviewer. The candidate gave a weak answer.
Role: {role}. Interview type: {interview_type}.
Original question: {question}
Candidate's answer: {answer}
Score: {score}/10 because: {feedback}

Ask ONE probing follow-up targeting the specific gap. Match the interview type.
Output only the follow-up question — no preamble.
"""
```

### Answer Evaluation
```
EVALUATE_PROMPT = """
You are evaluating a candidate's answer in a technical interview.
Role: {role}. Topic: {topic}.
Question: {question}
Answer: {answer}

Evaluate strictly. Return ONLY valid JSON:
{{"score": <int 1-10>, "feedback": "<2-3 sentences explaining the score>"}}
No other text. No markdown.
"""
```

### Final Report
```
REPORT_PROMPT = """
Mock interview complete for a {role} candidate.
Topics: {topics}. Scores: {scores}.
Transcript: {transcript}

Return ONLY valid JSON:
{{
  "overall_score": <float>,
  "grade": "<A+|A|B|C|D>",
  "topic_breakdown": [{{"topic": "", "score": 0, "comment": ""}}],
  "strengths": ["", ""],
  "weaknesses": ["", ""],
  "action_plan": [{{"tip": "", "resource": ""}}]
}}
No other text. No markdown.
"""
```

---

## 7. Cross-Cutting Concerns

### LLM JSON Robustness
Llama 3.1 70B occasionally wraps JSON in code fences or adds preamble text. `call_llm_json` in `llm.py` handles this with a two-attempt strategy:
1. Strip ```` ```json ```` and ```` ``` ```` fences.
2. Find the first `{` and last `}` and parse that slice.
3. On failure, retry once with an explicit "return only JSON" suffix.
4. On second failure, return `None` — callers must handle `None` with a safe default.

### Groq Rate Limits
Free tier: 30 requests/minute, 14,400/day. A single 4-topic interview averages ~13 LLM calls (4 questions + up to 8 follow-ups + 1 report). Safe under the cap. If a `429` response arrives, return HTTP 429 to the frontend with message "Too many requests — please wait a moment and try again."

### State Minimalism
Do not add fields to `InterviewState` beyond what is defined in §5 M2. Do not store the LLM client or any non-serializable object in state.

### Secrets
`GROQ_API_KEY` is backend-only. Never import it or reference it in React code. Verify `.env` is in `.gitignore` before the first push. Run `git log --all --full-history -- .env` to confirm it has never been committed.

### CORS
Lock `ALLOWED_ORIGIN` to the exact Vercel URL in production. Never use `"*"` in a deployed backend.

---

## 8. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Web Speech API unavailable (Safari, Firefox) | High | Feature-detect on load; force voice OFF; text input always available |
| Render free tier cold start (~30s) | Medium | "Waking up the server..." banner on slow `/start` response |
| Groq returns malformed JSON | Medium | `call_llm_json` two-attempt parser + safe default return |
| `MemorySaver` loses state on Render redeploy | Low (MVP) | Acceptable per PRD §13; add SQLite checkpointer in v1.1 |
| `speechSynthesis.getVoices()` returns empty on first call | Medium | Register `onvoiceschanged` listener; re-select voice on change |
| Concurrent interviews on one Render instance | Low (MVP) | `sessions` dict is per-process; PRD §13 excludes multi-session scaling |
| `interview_type` ignored in question quality | Low | Fixed by wiring `{interview_type}` into QUESTION_PROMPT and FOLLOWUP_PROMPT |

---

## 9. Out of Scope (per PRD §13)

Do not build any of the following in v1.0.0:
- User authentication or login system.
- Persistent database (SQLite, PostgreSQL, Firebase Firestore).
- Multi-user / multi-session scaling.
- Custom question sets uploaded by users.
- Video recording of the interview.
- Calendar integration for scheduling.
- Company-specific question banks.
- PDF export of report.
- Dark mode toggle.
- Timer per question (pressure mode).

---

## 10. Definition of Done

The project is complete when ALL of the following are true:

**Product (PRD §12):**
- [ ] User can open the app in Chrome and reach the landing screen without errors.
- [ ] User can complete the setup form and click Begin Interview successfully.
- [ ] First question appears as text in chat AND is spoken aloud by the AI.
- [ ] Clicking the mic button starts listening and shows a live transcript.
- [ ] Submitting an answer triggers evaluation and a follow-up or next question.
- [ ] Progress bar (F-012) advances and colors correctly after each topic.
- [ ] Score sidebar updates correctly after every evaluated answer.
- [ ] After all topics, the report card renders with grade, breakdown, and action plan.
- [ ] Entire flow works without any paid API or subscription.
- [ ] App is deployed and accessible via a public URL.

**Code quality:**
- [ ] `backend/.env` is gitignored and absent from all git history.
- [ ] `backend/.env.example` exists and is committed.
- [ ] `interview_type` is used in QUESTION_PROMPT and FOLLOWUP_PROMPT.
- [ ] `voice_enabled` and `speech_rate` are in StartRequest, stored in state, returned in StartResponse.
- [ ] Topic count validated as 2–4 in both frontend and backend.
- [ ] All buttons have `aria-label`. Progress bar has `role="progressbar"`.
- [ ] Mobile layout verified at 375px viewport with no horizontal scroll.

**Repository:**
- [ ] GitHub repository is public.
- [ ] README has quick-start commands, both public URLs, and a demo GIF or video link.
- [ ] One full interview recorded as a manual test pass (screenshots of each screen).

---

*End of IMPLEMENTATION_PLAN.md — v2.0.0*
*Adaptive Mock Interview Coach | Python + LangGraph + FastAPI + React | Cost: ₹0*