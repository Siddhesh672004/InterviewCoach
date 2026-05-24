"""FastAPI app exposing /start, /answer, /report, /health, /upload-resume, /parse-jd.

Drives the LangGraph nodes directly per the node-by-node execution model
documented in IMPLEMENTATION_PLAN.md §5 M2. State is stored in an in-process
dict keyed by session_id; lost on restart (acceptable per PRD §13).

v2 adds resume upload + JD parsing endpoints and threads mode/resume/jd into
state at session creation time.
"""
import os
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from models import (
    StartRequest,
    StartResponse,
    AnswerRequest,
    AnswerResponse,
    ReportResponse,
    HealthResponse,
    ResumeUploadResponse,
    ParseJDRequest,
    ParseJDResponse,
    SuggestTopicsRequest,
    SuggestTopicsResponse,
    INTERVIEW_MODES,
)
from graph import (
    InterviewState,
    initial_state,
    generate_question,
    evaluate_answer,
    route_decision,
    record_and_advance,
    bump_followup,
    wrap_up_report,
    analyze_resume,
    analyze_jd,
)
from parsers import extract_resume, clean_jd, MAX_RESUME_CHARS

load_dotenv()

app = FastAPI(title="Interview Coach API", version="2.0.0")

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGIN", "http://localhost:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict[str, InterviewState] = {}

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_RESUME_EXT = (".pdf", ".docx", ".doc", ".txt")


# ── Health ───────────────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")


# ── Resume / JD prep ─────────────────────────────────────────────────────────


@app.post("/upload-resume", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not filename.endswith(ALLOWED_RESUME_EXT):
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Upload a .pdf, .docx, .doc, or .txt file.",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (max 5 MB).")

    text = extract_resume(filename, content)
    if not text or len(text) < 50:
        raise HTTPException(
            status_code=422,
            detail="Could not extract enough text from this resume. Try a different file.",
        )

    summary = analyze_resume(text)
    return ResumeUploadResponse(resume_text=text, resume_summary=summary, chars=len(text))


@app.post("/parse-jd", response_model=ParseJDResponse)
def parse_jd(payload: ParseJDRequest):
    cleaned = clean_jd(payload.jd_text)
    if len(cleaned) < 30:
        raise HTTPException(
            status_code=422,
            detail="Job description is too short. Please paste the full JD.",
        )
    summary = analyze_jd(cleaned)
    return ParseJDResponse(jd_text=cleaned, jd_summary=summary, chars=len(cleaned))


@app.post("/suggest-topics", response_model=SuggestTopicsResponse)
def suggest_topics(payload: SuggestTopicsRequest):
    """Suggest 3-4 topics based on resume + JD signals.

    Falls back to a small default set if nothing useful is provided.
    """
    topics: list[str] = []
    if payload.jd_summary:
        for s in payload.jd_summary.get("required_skills", [])[:4]:
            if s and s not in topics:
                topics.append(s)
        for f in payload.jd_summary.get("focus_areas", [])[:2]:
            if f and f not in topics and len(topics) < 4:
                topics.append(f)

    if len(topics) < 4 and payload.resume_summary:
        for s in payload.resume_summary.get("top_skills", [])[:4]:
            if s and s not in topics and len(topics) < 4:
                topics.append(s)

    if not topics:
        topics = ["Core Skills", "Problem Solving", "System Design", "Behavioral"]

    return SuggestTopicsResponse(topics=topics[:4])


# ── Interview flow ───────────────────────────────────────────────────────────


@app.post("/start", response_model=StartResponse)
def start_interview(payload: StartRequest):
    if payload.mode not in INTERVIEW_MODES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid mode. Must be one of: {', '.join(INTERVIEW_MODES)}.",
        )

    session_id = str(uuid.uuid4())

    state = initial_state(
        role=payload.role,
        difficulty=payload.difficulty,
        topics=payload.topics,
        interview_type=payload.interview_type,
        voice_enabled=payload.voice_enabled,
        speech_rate=payload.speech_rate,
        mode=payload.mode,
        resume_text=payload.resume_text or "",
        resume_summary=payload.resume_summary or {},
        jd_text=payload.jd_text or "",
        jd_summary=payload.jd_summary or {},
    )
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
        mode=state["mode"],
        resume_summary=state.get("resume_summary") or None,
        jd_summary=state.get("jd_summary") or None,
    )


@app.post("/answer", response_model=AnswerResponse)
def submit_answer(payload: AnswerRequest):
    state = sessions.get(payload.session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session not found. It may have expired.")

    answer = payload.answer.strip()
    if not answer:
        raise HTTPException(status_code=422, detail="Answer cannot be empty.")

    state["current_answer"] = answer
    state.update(evaluate_answer(state))

    decision = route_decision(state)
    topic_changed = False
    is_done = False

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
    if state is None or not state.get("final_report"):
        raise HTTPException(status_code=404, detail="Report not found.")
    return ReportResponse(final_report=state["final_report"])
