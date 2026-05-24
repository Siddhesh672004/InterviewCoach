"""Pydantic request/response models for the FastAPI endpoints."""
from typing import List, Optional
from pydantic import BaseModel, Field

# Allowed interview modes for v2
INTERVIEW_MODES = ("quick", "technical", "resume_driven", "jd_targeted", "hr_behavioral")


class StartRequest(BaseModel):
    role: str
    difficulty: str
    topics: List[str] = Field(min_length=2, max_length=4)
    interview_type: str
    voice_enabled: bool = False
    speech_rate: float = 1.0
    # v2 additions — all optional, all default to "quick"-mode behaviour
    mode: str = "quick"
    resume_text: Optional[str] = None
    resume_summary: Optional[dict] = None
    jd_text: Optional[str] = None
    jd_summary: Optional[dict] = None


class StartResponse(BaseModel):
    session_id: str
    question: str
    topic: str
    topic_index: int
    total_topics: int
    voice_enabled: bool
    speech_rate: float
    mode: str
    resume_summary: Optional[dict] = None
    jd_summary: Optional[dict] = None


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


class AnswerResponse(BaseModel):
    feedback: str
    score: int
    next_question: Optional[str] = None
    next_topic: Optional[str] = None
    topic_changed: bool = False
    is_done: bool = False
    final_report: Optional[dict] = None


class ReportResponse(BaseModel):
    final_report: dict


class HealthResponse(BaseModel):
    status: str


# v2 — resume / JD


class ResumeUploadResponse(BaseModel):
    resume_text: str
    resume_summary: dict
    chars: int


class ParseJDRequest(BaseModel):
    jd_text: str


class ParseJDResponse(BaseModel):
    jd_text: str
    jd_summary: dict
    chars: int


class SuggestTopicsRequest(BaseModel):
    role: Optional[str] = None
    mode: str = "quick"
    resume_summary: Optional[dict] = None
    jd_summary: Optional[dict] = None


class SuggestTopicsResponse(BaseModel):
    topics: List[str]
