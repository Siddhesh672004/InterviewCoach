import { useNavigate } from "react-router-dom";
import styles from "./MarketingPages.module.css";

const FLOW = [
  {
    n: "01",
    title: "Pick your mode",
    desc: "Choose how the AI will interview you. Each mode shapes the question style and what context the AI uses.",
    sub: [
      "Quick — generic role + topics, fastest start",
      "Resume-driven — questions tied to your projects and skills",
      "JD-targeted — focused on a specific role's requirements",
      "HR / Behavioral — soft skills, motivation, conflict, culture-fit",
    ],
  },
  {
    n: "02",
    title: "Add context (optional)",
    desc: "Upload a resume or paste a JD if you have one. The richer the context, the more personalized the questions.",
    sub: [
      "PDF / DOCX upload — parsed in-browser-to-server, never stored",
      "Paste any JD — we extract must-haves and seniority",
      "Skip both for a quick generic round",
      "Auto-suggested topics from your resume + JD signals",
    ],
  },
  {
    n: "03",
    title: "Configure the session",
    desc: "Pick role, difficulty, 2-4 topics, and decide whether to enable voice. Tweak the interviewer's speaking speed if needed.",
    sub: [
      "Role + difficulty (Beginner / Intermediate / Advanced)",
      "Topic checkboxes (auto-populated from role)",
      "Voice mode toggle — Chrome/Edge supported",
      "Speech rate slider — slow / normal / fast",
    ],
  },
  {
    n: "04",
    title: "Run the interview",
    desc: "The AI speaks the question, you speak (or type) the answer. It scores, gives feedback, and decides what comes next.",
    sub: [
      "Real-time transcript while you speak",
      "Live score sidebar updates after every answer",
      "Probing follow-ups on weak answers",
      "Step progress bar showing topic-by-topic flow",
    ],
  },
  {
    n: "05",
    title: "Review your report",
    desc: "A detailed scorecard arrives the moment you finish. Letter grade, topic breakdown, strengths, gaps, and a concrete action plan.",
    sub: [
      "Overall grade + 1-10 score per topic",
      "AI-written strengths and weaknesses",
      "Resume-vs-JD alignment paragraph (if both provided)",
      "Action plan with specific resources, not generic tips",
    ],
  },
];

export default function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <span className={styles.pageBadge}>How it works</span>
          <h1 className={styles.pageTitle}>
            From signup to report card in <span className="gradient-text">under 30 minutes</span>
          </h1>
          <p className={styles.pageSubtitle}>
            Five steps. No fluff. Here's exactly what happens between clicking "start" and
            getting your scorecard.
          </p>
        </div>

        <div className={styles.flowList}>
          {FLOW.map((f) => (
            <div key={f.n} className={styles.flowItem}>
              <div className={styles.flowNum}>{f.n}</div>
              <div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <ul>
                  {f.sub.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 60 }}>
          <button
            className="btn-primary"
            onClick={() => navigate("/setup")}
            style={{ fontSize: 16, padding: "14px 28px" }}
          >
            Start your first interview →
          </button>
        </div>
      </div>
    </div>
  );
}
