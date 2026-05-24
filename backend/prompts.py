"""LLM prompt templates for the interview flow.

Modes supported:
- quick:          role + topics only (original v1 flow)
- technical:      role + topics, deeper grilling
- resume_driven:  questions tied to specific projects/skills in the resume
- jd_targeted:    questions extracted from the job description requirements
- hr_behavioral:  soft-skills, motivation, conflict, leadership

Resume and JD context are injected when available; prompts gracefully degrade
when fields are empty so a single template can serve every mode.
"""

# ── Prep / analysis prompts ──────────────────────────────────────────────────

ANALYZE_RESUME_PROMPT = """\
You are a senior recruiter analyzing a candidate's resume.

Resume text:
{resume_text}

Extract the most relevant signals as JSON. Return ONLY valid JSON:
{{
  "candidate_name": "<string or empty>",
  "current_role": "<most recent role or empty>",
  "years_experience": <integer, best estimate>,
  "top_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "key_projects": [
    {{"name": "<short name>", "summary": "<one-line description>"}}
  ],
  "domains": ["<domain 1>", "<domain 2>"],
  "education": "<one-line summary>"
}}
No other text. No markdown.
"""

ANALYZE_JD_PROMPT = """\
You are a senior recruiter analyzing a job description.

Job description:
{jd_text}

Extract the most relevant signals as JSON. Return ONLY valid JSON:
{{
  "job_title": "<string>",
  "company_signal": "<one-line context if mentioned, else empty>",
  "required_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "nice_to_have": ["skill 1", "skill 2"],
  "responsibilities": ["responsibility 1", "responsibility 2", "responsibility 3"],
  "seniority": "<junior|mid|senior|lead>",
  "focus_areas": ["focus 1", "focus 2"]
}}
No other text. No markdown.
"""

# ── Question generation ──────────────────────────────────────────────────────

QUESTION_PROMPT = """\
You are a strict but fair interviewer at a top tech company.

Mode: {mode}
Role: {role}
Interview type: {interview_type}
Current topic: {topic}
Difficulty: {difficulty}

Candidate profile (may be partial):
{resume_summary}

Job description summary (may be partial):
{jd_summary}

CRITICAL — mode rules (follow exactly, never mix lanes):
- "quick" / "technical": ask a {difficulty}-level technical question on {topic}.
  Do NOT ask behavioral or culture-fit questions in these modes.
- "resume_driven": ask a question that probes a specific project, role, or skill
  drawn from the candidate's resume above and tied to {topic}. If the resume
  summary is empty, fall back to a technical question on {topic}.
- "jd_targeted": ask a question rooted in a specific requirement from the JD
  summary above and tied to {topic}. If the JD summary is empty, fall back to
  a technical question on {topic}.
- "hr_behavioral": ask ONLY a behavioral, situational, motivational, or
  culture-fit question on {topic}. Use the STAR framing (situation, task,
  action, result) when natural. NEVER ask coding, algorithmic, system-design,
  framework-syntax, or any other technical knowledge question in this mode —
  even if {topic} sounds technical, reframe it behaviorally (e.g. for topic
  "System Design" ask about a time they influenced an architectural decision,
  not how to design a system). No code. No definitions. No "what is X".

Output rules:
- Ask exactly ONE question.
- Do not give hints. Do not number it. Do not add preamble.
- Output only the question text.
"""

FOLLOWUP_PROMPT = """\
You are an interviewer. The candidate gave a weak answer and you want to probe deeper.

Mode: {mode}
Role: {role}
Topic: {topic}
Original question: {question}
Candidate's answer: {answer}
Score: {score}/10 — Reason: {feedback}

Candidate profile (may be partial):
{resume_summary}

Job description summary (may be partial):
{jd_summary}

Ask ONE probing follow-up that targets the specific gap. Stay in the mode's lane:
- "hr_behavioral": ask for a concrete example, measurable outcome, or what they
  learned. NEVER pivot to a technical question.
- "technical" / "quick" / "jd_targeted" / "resume_driven": ask for the concept
  they missed, the trade-off they ignored, or a deeper technical detail.

Output only the follow-up question — no preamble, no quotes.
"""

# ── Evaluation ───────────────────────────────────────────────────────────────

EVALUATE_PROMPT = """\
You are evaluating a candidate's answer in a real interview.

Mode: {mode}
Role: {role}
Topic: {topic}
Question: {question}
Answer: {answer}

Job description summary (may be partial):
{jd_summary}

Score strictly out of 10:
- 1-3: incorrect or missing core idea
- 4-5: partial, surface-level
- 6-7: solid, hits the main idea
- 8-9: strong, includes trade-offs and specifics
- 10:  exceptional, expert-level depth

Return ONLY valid JSON:
{{"score": <integer 1-10>, "feedback": "<2-3 sentences explaining the score, citing specifics>"}}
No other text. No markdown.
"""

# ── Final report ─────────────────────────────────────────────────────────────

REPORT_PROMPT = """\
You just completed a mock interview.

Mode: {mode}
Role: {role}
Topics covered: {topics}
Scores per topic: {scores}

Candidate profile (may be partial):
{resume_summary}

Job description summary (may be partial):
{jd_summary}

Full Q&A transcript:
{transcript}

Generate a personalized performance report. Tailor strengths/weaknesses/action plan
to the candidate's resume and the JD requirements when available. Resources should
be specific (course names, books, problem sets), not generic.

Return ONLY valid JSON:
{{
  "overall_score": <float, average of scores>,
  "grade": "<A+|A|B|C|D>",
  "fit_summary": "<2-3 sentence summary of how well the candidate fits the role/JD>",
  "topic_breakdown": [{{"topic": "", "score": 0, "comment": ""}}],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "action_plan": [
    {{"tip": "<specific actionable tip>", "resource": "<concrete resource name>"}}
  ],
  "resume_jd_alignment": "<one-paragraph note on resume vs JD gaps, or empty if no JD/resume>"
}}
No other text. No markdown.
"""
