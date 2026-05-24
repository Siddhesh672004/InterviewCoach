import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";

const FEATURES = [
  {
    icon: "🎙️",
    title: "Voice-first interviews",
    desc: "Speak your answers naturally. Our AI listens, transcribes in real-time, and responds — just like a human interviewer.",
  },
  {
    icon: "📄",
    title: "Resume + JD aware",
    desc: "Upload your resume and paste any JD. Questions adapt to your projects, skills, and the role's actual requirements.",
  },
  {
    icon: "🧠",
    title: "Adaptive follow-ups",
    desc: "Weak answer? The AI probes deeper, just like a real interviewer would. Strong answer? It moves on confidently.",
  },
  {
    icon: "📊",
    title: "Detailed scorecard",
    desc: "Topic-by-topic scoring, strengths, weaknesses, and a personalized action plan with concrete resources.",
  },
  {
    icon: "🤝",
    title: "HR + Technical modes",
    desc: "Practice both technical grilling and behavioral / HR rounds. Switch modes to match what you're preparing for.",
  },
  {
    icon: "💸",
    title: "Free forever",
    desc: "No credit card. No subscription. No hidden tier. Powered by free LLM inference on Groq.",
  },
];

const MODES = [
  {
    badge: "Mode 01",
    title: "Quick Practice",
    desc: "Pick a role, pick topics, start answering. The fastest way to warm up before a real interview.",
    bullets: ["No setup beyond role + topics", "Voice or text", "2-4 topics per session"],
    cta: "Start a quick session",
    href: "/setup?mode=quick",
  },
  {
    badge: "Mode 02",
    title: "Resume-Driven",
    desc: "Upload your resume. The AI grills you on the projects, skills, and experience you actually claim.",
    bullets: ["PDF / DOCX upload", "Project deep-dives", "Surfaces gaps in your story"],
    cta: "Upload your resume",
    href: "/setup?mode=resume_driven",
  },
  {
    badge: "Mode 03",
    title: "JD-Targeted",
    desc: "Paste any job description. We extract the must-haves and run a focused interview against the role.",
    bullets: ["Must-have skills extracted", "Role-specific questions", "Resume-vs-JD gap analysis"],
    cta: "Target a specific role",
    href: "/setup?mode=jd_targeted",
  },
  {
    badge: "Mode 04",
    title: "HR / Behavioral",
    desc: "Soft skills, motivation, conflict resolution, salary talk. Crush the rounds people forget to practice.",
    bullets: ["STAR-method coaching", "Motivation & culture-fit", "Negotiation prep"],
    cta: "Practice HR round",
    href: "/setup?mode=hr_behavioral",
  },
];

const STEPS = [
  { n: 1, title: "Pick a mode", desc: "Quick, resume-driven, JD-targeted, or HR. Each mode tailors the questions." },
  { n: 2, title: "Add context", desc: "Upload your resume and paste the JD. Skip if you want a generic round." },
  { n: 3, title: "Start the interview", desc: "Speak or type. The AI listens, evaluates, and follows up on weak answers." },
  { n: 4, title: "Get your report", desc: "Grade, topic breakdown, strengths, gaps, and a real action plan." },
];

const TESTIMONIALS = [
  {
    quote: "The resume-driven mode caught a gap in my cloud experience I never would have spotted myself. Saved me from bombing the real interview.",
    name: "Priya R.",
    role: "Backend Engineer",
    initials: "PR",
  },
  {
    quote: "I've used Pramp and Interviewing.io. The follow-up logic here is genuinely smarter — it knew exactly when I was hand-waving.",
    name: "Marcus L.",
    role: "Senior SWE",
    initials: "ML",
  },
  {
    quote: "Free was a hard sell at first. After the first session I'd have paid for it. The action plan is the part that actually moved my prep forward.",
    name: "Anika S.",
    role: "ML Engineer",
    initials: "AS",
  },
];

const FAQS = [
  {
    q: "Is it really free? What's the catch?",
    a: "Yes — completely free. We use Groq's free Llama inference and the browser's built-in speech APIs, so there's no per-call cost to pass to you. No credit card, no trial, no upgrade nag.",
  },
  {
    q: "What file types do you accept for resumes?",
    a: "PDF and DOCX are fully supported. Plain text and legacy .doc files work as a best-effort fallback. Your resume is processed in-memory and never stored on our servers.",
  },
  {
    q: "Will this work in my browser?",
    a: "Voice features need a Chromium-based browser (Chrome, Edge, Brave). Firefox and Safari fall back to text input gracefully — you can still complete a full interview.",
  },
  {
    q: "How does the AI know what to ask?",
    a: "Depending on mode, it pulls signals from your resume, the JD requirements, or a curated topic list for the role. Every answer is scored, and a low score triggers a probing follow-up.",
  },
  {
    q: "Can I practice for a specific company?",
    a: "Indirectly — paste their JD into JD-targeted mode and the AI will match the question style to the seniority and required skills listed.",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.faqItem} ${open ? styles.faqItemOpen : ""}`}>
      <button
        className={styles.faqQ}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {q}
        <span className={`${styles.faqIcon} ${open ? styles.faqIconOpen : ""}`}>+</span>
      </button>
      <div className={`${styles.faqA} ${open ? styles.faqAOpen : ""}`}>{a}</div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroOrb} aria-hidden="true" />
        <div className="container">
          <div className={`${styles.heroBadge} fade-up`}>
            <span className={styles.heroBadgeDot} />
            Powered by Llama 3.3 — runs free, runs fast
          </div>

          <h1 className={`${styles.heroTitle} fade-up-delay-1`}>
            Land your dream role with{" "}
            <span className={styles.heroTitleAccent}>AI-powered mock interviews</span>
          </h1>

          <p className={`${styles.heroSubtitle} fade-up-delay-2`}>
            Upload your resume, paste the JD, and practice with an AI that actually
            listens, follows up on weak answers, and gives you a report that moves
            the needle.
          </p>

          <div className={`${styles.heroCtas} fade-up-delay-3`}>
            <button
              className="btn-primary"
              onClick={() => navigate("/setup")}
              style={{ fontSize: 16, padding: "14px 28px" }}
            >
              Start your interview →
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate("/how-it-works")}
              style={{ fontSize: 16, padding: "14px 28px" }}
            >
              See how it works
            </button>
          </div>

          <div className={`${styles.heroStats} fade-up-delay-3`}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>4 modes</span>
              <span className={styles.heroStatLabel}>Quick · Resume · JD · HR</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>&lt; 3s</span>
              <span className={styles.heroStatLabel}>Avg response</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>$0</span>
              <span className={styles.heroStatLabel}>Forever free</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo card ───────────────────────────────────────── */}
      <div className={`${styles.demoWrap} fade-up-delay-3`}>
        <div className={styles.demoCard}>
          <div className={styles.demoHeader}>
            <div className={styles.demoDots}>
              <div className={styles.demoDot} />
              <div className={styles.demoDot} />
              <div className={styles.demoDot} />
            </div>
            <span className={styles.demoLabel}>Live interview · Senior Backend Engineer</span>
          </div>
          <div className={styles.demoBody}>
            <div className={styles.demoChat}>
              <div className={`${styles.demoBubble} ${styles.demoBubbleAi}`}>
                Walk me through how you'd design a rate limiter for an API gateway handling 100k req/sec.
              </div>
              <div className={`${styles.demoBubble} ${styles.demoBubbleUser}`}>
                I'd use a token bucket algorithm with Redis as the shared store. Keys would be sharded by user ID, and...
              </div>
              <div className={`${styles.demoBubble} ${styles.demoBubbleScore}`}>
                <strong>Score: 8/10.</strong> Strong fundamentals. Mention sliding-window over fixed-window for fairness, and explain how you'd handle Redis failure gracefully.
              </div>
            </div>
            <div className={styles.demoStats}>
              <div className={styles.demoStatRow}>
                <span className={styles.demoStatLabel}>System Design</span>
                <div className={styles.demoStatBar}>
                  <div className={styles.demoStatFill} style={{ width: "82%" }} />
                </div>
                <span className={styles.demoStatVal}>8.2</span>
              </div>
              <div className={styles.demoStatRow}>
                <span className={styles.demoStatLabel}>Databases</span>
                <div className={styles.demoStatBar}>
                  <div className={styles.demoStatFill} style={{ width: "70%" }} />
                </div>
                <span className={styles.demoStatVal}>7.0</span>
              </div>
              <div className={styles.demoStatRow}>
                <span className={styles.demoStatLabel}>APIs &amp; REST</span>
                <div className={styles.demoStatBar}>
                  <div className={styles.demoStatFill} style={{ width: "90%" }} />
                </div>
                <span className={styles.demoStatVal}>9.0</span>
              </div>
              <div className={styles.demoStatRow}>
                <span className={styles.demoStatLabel}>Caching</span>
                <div className={styles.demoStatBar}>
                  <div className={styles.demoStatFill} style={{ width: "55%" }} />
                </div>
                <span className={styles.demoStatVal}>5.5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Why MockMind</span>
            <h2 className={styles.sectionTitle}>Built for actual prep, not demos</h2>
            <p className={styles.sectionSubtitle}>
              Every feature is here because real interview practice needed it. No fluff,
              no gamification, no streaks-and-badges nonsense.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon} aria-hidden="true">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modes ───────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Four modes</span>
            <h2 className={styles.sectionTitle}>Practice the round you actually face</h2>
            <p className={styles.sectionSubtitle}>
              Quick warmup, deep technical grilling, or the soft-skill round you've been
              putting off — pick the mode that matches your week.
            </p>
          </div>

          <div className={styles.modesGrid}>
            {MODES.map((m) => (
              <button
                key={m.title}
                className={styles.modeCard}
                onClick={() => navigate(m.href)}
                type="button"
              >
                <span className={styles.modeBadge}>{m.badge}</span>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
                <ul className={styles.modeFeatures}>
                  {m.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
                <span className={styles.modeCta}>{m.cta} →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>How it works</span>
            <h2 className={styles.sectionTitle}>Four steps. Five minutes. Real results.</h2>
          </div>

          <div className={styles.steps}>
            {STEPS.map((s) => (
              <div key={s.n} className={styles.stepCard}>
                <div className={styles.stepNum}>{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>What people say</span>
            <h2 className={styles.sectionTitle}>From students to senior engineers</h2>
          </div>

          <div className={styles.testGrid}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className={styles.testCard}>
                <p className={styles.testQuote}>"{t.quote}"</p>
                <div className={styles.testAuthor}>
                  <div className={styles.testAvatar}>{t.initials}</div>
                  <div>
                    <div className={styles.testName}>{t.name}</div>
                    <div className={styles.testRole}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>FAQ</span>
            <h2 className={styles.sectionTitle}>Questions, answered</h2>
          </div>

          <div className={styles.faqList}>
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <h2>Ready when you are.</h2>
          <p>
            Spin up a mock interview in under 30 seconds. Bring a resume, a JD, or
            nothing at all — the AI takes it from there.
          </p>
          <div className={styles.ctaActions}>
            <button
              className="btn-primary"
              onClick={() => navigate("/setup")}
              style={{ fontSize: 16, padding: "14px 32px" }}
            >
              Start your interview →
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate("/features")}
              style={{ fontSize: 16, padding: "14px 28px" }}
            >
              Explore features
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
