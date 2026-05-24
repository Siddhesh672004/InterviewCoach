"""LangGraph state, nodes, and edge wiring for the interview flow.

Execution model: node-by-node from API (see IMPLEMENTATION_PLAN.md §5 M2).
v2 adds: mode, resume context, JD context. Prompts gracefully degrade
when these fields are empty, so the original "quick" flow still works.
"""
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from llm import call_llm, call_llm_json
from prompts import (
    QUESTION_PROMPT,
    FOLLOWUP_PROMPT,
    EVALUATE_PROMPT,
    REPORT_PROMPT,
    ANALYZE_RESUME_PROMPT,
    ANALYZE_JD_PROMPT,
)


# ── State ────────────────────────────────────────────────────────────────────


class InterviewState(TypedDict):
    # Setup
    role: str
    difficulty: str
    topics: List[str]
    interview_type: str
    voice_enabled: bool
    speech_rate: float
    # Mode + context (v2)
    mode: str  # 'quick' | 'technical' | 'resume_driven' | 'jd_targeted' | 'hr_behavioral'
    resume_text: str
    resume_summary: dict  # parsed via analyze_resume()
    jd_text: str
    jd_summary: dict  # parsed via analyze_jd()
    # Progress
    current_topic_index: int
    topics_done: List[str]
    follow_up_count: int
    # Current turn
    current_question: str
    current_answer: str
    current_score: int
    current_feedback: str
    # History
    scores: List[int]
    messages: List[dict]
    # Control / output
    next_action: str
    final_report: dict


def initial_state(
    role: str,
    difficulty: str,
    topics: List[str],
    interview_type: str,
    voice_enabled: bool,
    speech_rate: float,
    mode: str = "quick",
    resume_text: str = "",
    resume_summary: Optional[dict] = None,
    jd_text: str = "",
    jd_summary: Optional[dict] = None,
) -> InterviewState:
    return {
        "role": role,
        "difficulty": difficulty,
        "topics": topics,
        "interview_type": interview_type,
        "voice_enabled": voice_enabled,
        "speech_rate": speech_rate,
        "mode": mode,
        "resume_text": resume_text or "",
        "resume_summary": resume_summary or {},
        "jd_text": jd_text or "",
        "jd_summary": jd_summary or {},
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


# ── Helpers ──────────────────────────────────────────────────────────────────


def _format_resume_summary(summary: dict) -> str:
    if not summary:
        return "(no resume provided)"
    skills = ", ".join(summary.get("top_skills", [])[:6]) or "—"
    projects = "; ".join(
        f"{p.get('name', '')}: {p.get('summary', '')}"
        for p in summary.get("key_projects", [])[:3]
    ) or "—"
    return (
        f"Name: {summary.get('candidate_name') or 'unknown'}. "
        f"Current role: {summary.get('current_role') or 'unknown'}. "
        f"Years exp: {summary.get('years_experience', 0)}. "
        f"Top skills: {skills}. "
        f"Key projects: {projects}. "
        f"Domains: {', '.join(summary.get('domains', [])[:3]) or '—'}."
    )


def _format_jd_summary(summary: dict) -> str:
    if not summary:
        return "(no job description provided)"
    required = ", ".join(summary.get("required_skills", [])[:6]) or "—"
    responsibilities = "; ".join(summary.get("responsibilities", [])[:3]) or "—"
    return (
        f"Title: {summary.get('job_title') or 'unknown'}. "
        f"Seniority: {summary.get('seniority') or 'unknown'}. "
        f"Required skills: {required}. "
        f"Key responsibilities: {responsibilities}. "
        f"Focus areas: {', '.join(summary.get('focus_areas', [])[:3]) or '—'}."
    )


# ── Public analyzers (called from server before /start completes) ────────────


def analyze_resume(resume_text: str) -> dict:
    if not resume_text or len(resume_text.strip()) < 50:
        return {}
    result = call_llm_json(ANALYZE_RESUME_PROMPT.format(resume_text=resume_text))
    return result or {}


def analyze_jd(jd_text: str) -> dict:
    if not jd_text or len(jd_text.strip()) < 30:
        return {}
    result = call_llm_json(ANALYZE_JD_PROMPT.format(jd_text=jd_text))
    return result or {}


# ── Nodes ────────────────────────────────────────────────────────────────────


def generate_question(state: InterviewState) -> dict:
    topic = state["topics"][state["current_topic_index"]]
    resume_summary = _format_resume_summary(state.get("resume_summary") or {})
    jd_summary = _format_jd_summary(state.get("jd_summary") or {})

    if state["follow_up_count"] == 0:
        prompt = QUESTION_PROMPT.format(
            mode=state.get("mode", "quick"),
            role=state["role"],
            topic=topic,
            difficulty=state["difficulty"],
            interview_type=state["interview_type"],
            resume_summary=resume_summary,
            jd_summary=jd_summary,
        )
    else:
        prompt = FOLLOWUP_PROMPT.format(
            mode=state.get("mode", "quick"),
            role=state["role"],
            topic=topic,
            question=state["current_question"],
            answer=state["current_answer"],
            score=state["current_score"],
            feedback=state["current_feedback"],
            resume_summary=resume_summary,
            jd_summary=jd_summary,
        )
    question = call_llm(prompt)
    return {"current_question": question}


def evaluate_answer(state: InterviewState) -> dict:
    topic = state["topics"][state["current_topic_index"]]
    jd_summary = _format_jd_summary(state.get("jd_summary") or {})
    prompt = EVALUATE_PROMPT.format(
        mode=state.get("mode", "quick"),
        role=state["role"],
        topic=topic,
        question=state["current_question"],
        answer=state["current_answer"],
        jd_summary=jd_summary,
    )
    result = call_llm_json(prompt)
    if result is None:
        result = {
            "score": 5,
            "feedback": "Could not evaluate answer — defaulting to mid-score.",
        }
    score = int(result.get("score", 5))
    score = max(1, min(10, score))
    return {
        "current_score": score,
        "current_feedback": result.get("feedback", "No feedback available."),
    }


def route_decision(state: InterviewState) -> str:
    score = state["current_score"]
    follow_ups = state["follow_up_count"]
    current_idx = state["current_topic_index"]
    total_topics = len(state["topics"])

    if score < 6 and follow_ups < 2:
        return "follow_up"
    if current_idx + 1 < total_topics:
        return "next_topic"
    return "wrap_up"


def record_and_advance(state: InterviewState) -> dict:
    topic = state["topics"][state["current_topic_index"]]
    new_scores = state["scores"] + [state["current_score"]]
    new_messages = state["messages"] + [
        {"role": "ai", "content": state["current_question"]},
        {"role": "user", "content": state["current_answer"]},
        {"role": "feedback", "content": state["current_feedback"]},
    ]
    new_topics_done = state["topics_done"] + [topic]
    return {
        "scores": new_scores,
        "messages": new_messages,
        "topics_done": new_topics_done,
        "follow_up_count": 0,
        "current_topic_index": state["current_topic_index"] + 1,
    }


def bump_followup(state: InterviewState) -> dict:
    return {"follow_up_count": state["follow_up_count"] + 1}


def wrap_up_report(state: InterviewState) -> dict:
    transcript_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in state["messages"]
    )
    topic_score_pairs = list(zip(state["topics_done"], state["scores"]))
    resume_summary = _format_resume_summary(state.get("resume_summary") or {})
    jd_summary = _format_jd_summary(state.get("jd_summary") or {})

    prompt = REPORT_PROMPT.format(
        mode=state.get("mode", "quick"),
        role=state["role"],
        topics=", ".join(state["topics"]),
        scores=str(topic_score_pairs),
        transcript=transcript_text,
        resume_summary=resume_summary,
        jd_summary=jd_summary,
    )
    report = call_llm_json(prompt)
    if report is None:
        avg = (
            round(sum(state["scores"]) / len(state["scores"]), 1)
            if state["scores"]
            else 0
        )
        report = {
            "overall_score": avg,
            "grade": "B",
            "fit_summary": "",
            "topic_breakdown": [
                {"topic": t, "score": s, "comment": ""}
                for t, s in zip(state["topics_done"], state["scores"])
            ],
            "strengths": ["Could not generate strengths."],
            "weaknesses": ["Could not generate weaknesses."],
            "action_plan": [
                {"tip": "Review your weakest topic.", "resource": "docs.python.org"}
            ],
            "resume_jd_alignment": "",
        }
    return {"final_report": report}


# ── Graph wiring ─────────────────────────────────────────────────────────────


_graph_builder = StateGraph(InterviewState)
_graph_builder.add_node("generate_question", generate_question)
_graph_builder.add_node("evaluate_answer", evaluate_answer)
_graph_builder.add_node("record_and_advance", record_and_advance)
_graph_builder.add_node("bump_followup", bump_followup)
_graph_builder.add_node("wrap_up_report", wrap_up_report)

_graph_builder.set_entry_point("generate_question")
_graph_builder.add_edge("generate_question", "evaluate_answer")
_graph_builder.add_conditional_edges(
    "evaluate_answer",
    route_decision,
    {
        "follow_up": "bump_followup",
        "next_topic": "record_and_advance",
        "wrap_up": "wrap_up_report",
    },
)
_graph_builder.add_edge("bump_followup", "generate_question")
_graph_builder.add_edge("record_and_advance", "generate_question")
_graph_builder.add_edge("wrap_up_report", END)

compiled_graph = _graph_builder.compile(checkpointer=MemorySaver())


# ── CLI driver ───────────────────────────────────────────────────────────────


if __name__ == "__main__":
    import pprint

    state = initial_state(
        role="Python Developer",
        difficulty="intermediate",
        topics=["Core Python", "OOP"],
        interview_type="technical",
        voice_enabled=False,
        speech_rate=1.0,
        mode="quick",
    )

    state.update(generate_question(state))
    print(f"\nAI: {state['current_question']}\n")

    while not state.get("final_report"):
        answer = input("You: ").strip()
        if not answer:
            continue
        state["current_answer"] = answer

        state.update(evaluate_answer(state))
        print(f"\n[Score: {state['current_score']}/10] {state['current_feedback']}\n")

        decision = route_decision(state)

        if decision == "follow_up":
            state.update(bump_followup(state))
            state.update(generate_question(state))
            print(f"AI (follow-up): {state['current_question']}\n")
        elif decision == "next_topic":
            state.update(record_and_advance(state))
            state.update(generate_question(state))
            current_topic = state["topics"][state["current_topic_index"]]
            print(f"\n--- Moving to: {current_topic} ---\n")
            print(f"AI: {state['current_question']}\n")
        elif decision == "wrap_up":
            state.update(record_and_advance(state))
            state.update(wrap_up_report(state))
            print("\n===== FINAL REPORT =====")
            pprint.pprint(state["final_report"])
