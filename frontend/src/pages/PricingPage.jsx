import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MarketingPages.module.css";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    unit: "forever",
    desc: "Everything in MockMind, with no credit card and no usage caps that matter.",
    features: [
      "Unlimited interview sessions",
      "All 4 modes (Quick / Resume / JD / HR)",
      "Voice + text input",
      "Resume + JD parsing",
      "Detailed scorecards",
      "Web Speech API powered TTS / STT",
      "Open source — self-host yours",
    ],
    cta: "Start free",
    href: "/setup",
    featured: true,
  },
  {
    name: "Self-Host",
    price: "$0",
    unit: "your infra, your rules",
    desc: "Clone the repo, plug in your Groq key, deploy it on your own infra. No data leaves your stack.",
    features: [
      "Full source on GitHub",
      "FastAPI + React stack",
      "Deploy to Render / Fly / Vercel free tiers",
      "Bring your own Groq API key (free tier: 14.4k calls/day)",
      "MIT licensed",
    ],
    cta: "View on GitHub",
    href: "#",
    featured: false,
  },
  {
    name: "Teams",
    price: "Soon",
    unit: "for bootcamps + universities",
    desc: "Cohort dashboards, shared resume library, instructor view, and SSO. In private beta.",
    features: [
      "Cohort progress tracking",
      "Shared role + topic templates",
      "Instructor / TA dashboard",
      "SSO (SAML / OIDC)",
      "Custom branding",
    ],
    cta: "Join the waitlist",
    href: "#",
    featured: false,
  },
];

const PRICING_FAQ = [
  {
    q: "Is the free tier really unlimited?",
    a: "Practically, yes. We pass through Groq's free tier — 30 requests/minute and 14,400 requests/day. A full 4-topic interview averages 13 calls, so you can comfortably run 1,000+ interviews per day per Groq key.",
  },
  {
    q: "Why is this free at all?",
    a: "Three reasons. (1) Groq gives free LLM inference. (2) The browser handles voice, so we have no STT/TTS cost. (3) We're not collecting your data, so we have no monetization to fund. Self-host if you want guarantees.",
  },
  {
    q: "What's in the Teams tier?",
    a: "Cohort tracking, shared resume / JD libraries, instructor dashboards, SSO, and custom branding. It's aimed at bootcamps, universities, and career services teams. Pricing TBD — join the waitlist for early access.",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: "var(--bg-glass)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        marginBottom: 12,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "18px 22px",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text-primary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        aria-expanded={open}
      >
        {q}
        <span
          style={{
            color: open ? "var(--accent-purple-soft)" : "var(--text-muted)",
            fontSize: 20,
            transform: open ? "rotate(45deg)" : "rotate(0)",
            transition: "transform 0.2s, color 0.2s",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0 22px 18px",
            color: "var(--text-secondary)",
            fontSize: 14.5,
            lineHeight: 1.65,
          }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <span className={styles.pageBadge}>Pricing</span>
          <h1 className={styles.pageTitle}>
            <span className="gradient-text">Free.</span> Forever.
          </h1>
          <p className={styles.pageSubtitle}>
            We don't charge you. We don't sell your data. We don't lock features behind
            a paywall. There's nothing to upgrade to.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`${styles.priceCard} ${t.featured ? styles.priceCardFeatured : ""}`}
            >
              {t.featured && <div className={styles.priceTag}>Most popular</div>}
              <div className={styles.priceName}>{t.name}</div>
              <div className={styles.priceAmount}>{t.price}</div>
              <div className={styles.priceUnit}>{t.unit}</div>
              <p className={styles.priceDesc}>{t.desc}</p>
              <ul className={styles.priceFeatures}>
                {t.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button
                className={`${styles.priceCta} ${
                  t.featured ? "btn-primary" : "btn-secondary"
                }`}
                onClick={() =>
                  t.href.startsWith("/")
                    ? navigate(t.href)
                    : window.open(t.href, "_blank", "noopener")
                }
              >
                {t.cta}
              </button>
            </div>
          ))}
        </div>

        <div className={styles.faqWrap}>
          <h2 className={styles.sectionTitle}>Pricing questions</h2>
          {PRICING_FAQ.map((f, i) => <FaqItem key={i} {...f} />)}
        </div>
      </div>
    </div>
  );
}
