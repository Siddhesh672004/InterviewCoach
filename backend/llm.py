"""Groq LLM client singleton + JSON-parsing helper.

Strategy for call_llm_json:
  1. Strip ```json fences.
  2. Find first { and last } and parse that slice.
  3. On failure, retry once with a stricter prompt suffix.
  4. On second failure, return None and log raw output. Callers must handle None.
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

_llm = ChatGroq(
    model=_MODEL,
    temperature=0.4,
    groq_api_key=os.getenv("GROQ_API_KEY"),
)


def call_llm(prompt: str) -> str:
    response = _llm.invoke([HumanMessage(content=prompt)])
    return response.content.strip()


def _parse_json(text: str):
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
    raw = call_llm(prompt)
    result = _parse_json(raw)
    if result is not None:
        return result

    strict = prompt + "\n\nIMPORTANT: Return ONLY the JSON object. No explanation. No markdown."
    raw2 = call_llm(strict)
    result2 = _parse_json(raw2)
    if result2 is not None:
        return result2

    print(f"[llm.py] JSON parse failed after retry. Raw output:\n{raw2}")
    return None


if __name__ == "__main__":
    print(call_llm("Say hello in one short sentence."))
