import { useNavigate } from "react-router-dom";
import styles from "./MarketingPages.module.css";

const FEATURES = [
  {
    icon: "🎙️",
    title: "Real voice conversation",
    desc: "Speak your answers in natural language. Web Speech API runs locally — no audio leaves your machine.",
    bullets: [
      "Real-time transcription as you speak",
      "Animated AI avatar with speaking states",
      "Adjustable interviewer speed (slow / normal / fast)",
      "Graceful text-input fallback for unsupported browsers",
    ],
  },
  {
    icon: "📄",
    title: "Resume parsing",
    desc: "Drop a PDF or DOCX and we extract the signal: skills, projects, years of experience, domains.",
    bullets: [
      "PDF + DOCX (and best-effort .doc / .txt)",
      "5 MB upload limit",
      "Resume processed in-memory; never persisted",
      "AI surfaces 5 top skills + 3 key projects automatically",
    ],
  },
  {
    icon: "📋",
    title: "Job description analysis",
    desc: "Paste any JD and the AI extracts must-haves, nice-to-haves, seniority, and focus areas.",
    bullets: [
      "Auto-detected required vs nice-to-have skills",
      "Seniority-aware question difficulty",
      "Resume-vs-JD gap analysis in the final report",
      "Works with any role from any source",
    ],
  },
  {
    icon: "🧠",
    title: "Adaptive question logic",
    desc: "A LangGraph state machine decides when to follow up, move on, or wrap up based on your scores.",
    bullets: [
      "Up to 2 probing follow-ups when scores drop below 6",
      "Auto-advances on strong answers",
      "Deterministic routing — no random LLM behaviour",
      "Tailored prompts per mode (technical, resume, JD, HR)",
    ],
  },
  {
    icon: "📊",
    title: "Personalized scorecard",
    desc: "Every interview ends with a real report. Topic breakdown, strengths, weaknesses, and an action plan.",
    bullets: [
      "1-10 score per topic with specific feedback",
      "Letter grade + overall score",
      "Strengths and gaps tied to your resume + JD",
      "3 concrete action items with named resources",
    ],
  },
  {
    icon: "🔐",
    title: "Privacy-first design",
    desc: "Sessions live in-memory only. Nothing is logged, nothing is sold, nothing is trained on.",
    bullets: [
      "No database, no analytics tracking",
      "Resume text discarded when session ends",
      "Open source — audit it yourself",
      "Self-hostable on your own machine",
    ],
  },
];

export default function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <span className={styles.pageBadge}>Features</span>
          <h1 className={styles.pageTitle}>
            Everything you need for a <span className="gradient-text">real interview</span>
          </h1>
          <p className={styles.pageSubtitle}>
            Six pillars of a serious interview prep tool. No bloat, no upsell — every
            feature exists because you'd notice it missing.
          </p>
        </div>

        <div className={styles.bigFeatureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.bigFeature}>
              <div className={styles.bigFeatureIcon} aria-hidden="true">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <ul className={styles.bullets}>
                {f.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            className="btn-primary"
            onClick={() => navigate("/setup")}
            style={{ fontSize: 16, padding: "14px 28px" }}
          >
            Try them all — start free →
          </button>
        </div>
      </div>
    </div>
  );
}
