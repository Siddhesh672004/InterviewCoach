"""Groq LLM client singleton + JSON-parsing helper.

Strategy for call_llm_json:
  1. Strip ```json fences.
  2. Find first { and last } and parse that slice.
  3. On failure, retry once with a stricter prompt suffix.
  4. On second failure, return None and log raw output. Callers must handle None.

Resilience: every Groq call is wrapped in try/except. Missing API key, rate
limits, network errors, or malformed responses NEVER crash the caller — they
return None (call_llm_json) or "" (call_llm). The endpoint layer decides how
to degrade the user experience.
"""
import os
import json
import re
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

load_dotenv()

# NOTE: PRD specifies llama-3.1-70b-versatile, but Groq retired that model in
# late 2024. llama-3.3-70b-versatile is the current drop-in replacement on the
# free tier with identical pricing and similar quality.
_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

if not _API_KEY:
    print(
        "[llm.py] WARNING: GROQ_API_KEY is not set. "
        "LLM calls will fail and degrade gracefully. "
        "Get a free key at https://console.groq.com and set it in backend/.env"
    )

try:
    _llm = ChatGroq(
        model=_MODEL,
        temperature=0.4,
        groq_api_key=_API_KEY or "missing",
    ) if _API_KEY else None
except Exception as e:
    print(f"[llm.py] Failed to initialise Groq client: {e}")
    _llm = None


def call_llm(prompt: str) -> str:
    """Plain text completion. Returns "" on any failure."""
    if _llm is None:
        return ""
    try:
        response = _llm.invoke([HumanMessage(content=prompt)])
        return (response.content or "").strip()
    except Exception as e:
        print(f"[llm.py] call_llm error: {e}")
        return ""


def _parse_json(text: str):
    if not text:
        return None
    text = re.sub(r"```json|```", "", text).strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        return None
    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError:
        return None


def call_llm_json(prompt: str) -> dict | None:
    """JSON completion. Returns None on any failure (caller must handle)."""
    if _llm is None:
        return None

    raw = call_llm(prompt)
    result = _parse_json(raw)
    if result is not None:
        return result

    strict = prompt + "\n\nIMPORTANT: Return ONLY the JSON object. No explanation. No markdown."
    raw2 = call_llm(strict)
    result2 = _parse_json(raw2)
    if result2 is not None:
        return result2

    if raw2:
        print(f"[llm.py] JSON parse failed after retry. Raw output:\n{raw2[:400]}")
    return None


def llm_available() -> bool:
    """Whether the Groq client is configured and ready."""
    return _llm is not None


if __name__ == "__main__":
    if not _API_KEY:
        print("Set GROQ_API_KEY in backend/.env first.")
    else:
        print(call_llm("Say hello in one short sentence."))
