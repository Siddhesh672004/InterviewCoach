import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInterview } from "../App.jsx";
import styles from "./ReportScreen.module.css";

function gradeColor(grade) {
  if (!grade) return styles.gradeAmber;
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return styles.gradeGreen;
  if (g === "B" || g === "C") return styles.gradeAmber;
  return styles.gradeRed;
}

function buildPlainText(report) {
  const lines = [];
  lines.push("=== INTERVIEW REPORT ===");
  lines.push(`Overall Grade: ${report.grade || "—"}`);
  lines.push(`Overall Score: ${report.overall_score ?? "—"}/10`);
  lines.push("");

  if (Array.isArray(report.topic_breakdown) && report.topic_breakdown.length) {
    lines.push("Topic Breakdown:");
    report.topic_breakdown.forEach((t) => {
      lines.push(`  - ${t.topic}: ${t.score}/10 — ${t.comment || ""}`);
    });
    lines.push("");
  }

  if (Array.isArray(report.strengths) && report.strengths.length) {
    lines.push("Strengths:");
    report.strengths.forEach((s) => lines.push(`  • ${s}`));
    lines.push("");
  }

  if (Array.isArray(report.weaknesses) && report.weaknesses.length) {
    lines.push("Areas to Improve:");
    report.weaknesses.forEach((w) => lines.push(`  • ${w}`));
    lines.push("");
  }

  if (Array.isArray(report.action_plan) && report.action_plan.length) {
    lines.push("Action Plan:");
    report.action_plan.forEach((a, i) => {
      lines.push(`  ${i + 1}. ${a.tip || ""}`);
      if (a.resource) lines.push(`     Resource: ${a.resource}`);
    });
  }
  return lines.join("\n");
}

export default function ReportScreen() {
  const navigate = useNavigate();
  const { finalReport, reset } = useInterview();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const plainText = useMemo(
    () => (finalReport ? buildPlainText(finalReport) : ""),
    [finalReport]
  );

  if (!finalReport) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Clipboard access denied — silently fail
    }
  };

  const handleTryAgain = () => {
    reset();
    navigate("/setup");
  };

  const handleShare = () => {
    const url = window.location.origin;
    const text = `I just scored ${finalReport.grade || ""} on a mock interview with MockMind AI! Try it free:`;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      url
    )}&summary=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const breakdown = Array.isArray(finalReport.topic_breakdown)
    ? finalReport.topic_breakdown
    : [];
  const strengths = Array.isArray(finalReport.strengths) ? finalReport.strengths : [];
  const weaknesses = Array.isArray(finalReport.weaknesses)
    ? finalReport.weaknesses
    : [];
  const actionPlan = Array.isArray(finalReport.action_plan)
    ? finalReport.action_plan
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Your Interview Report</h1>
          <p className={styles.subtitle}>Here's how you did. Take what's useful and keep practicing.</p>
        </header>

        <section className={`${styles.gradeCard} ${gradeColor(finalReport.grade)}`}>
          <div className={styles.gradeLetter}>{finalReport.grade || "—"}</div>
          <div className={styles.gradeMeta}>
            <div className={styles.gradeScore}>
              {finalReport.overall_score ?? "—"}<span>/10</span>
            </div>
            <div className={styles.gradeLabel}>Overall Score</div>
          </div>
        </section>

        {breakdown.length > 0 && (
          <section className={styles.section}>
            <h2>Topic Breakdown</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Score</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((t, i) => (
                    <tr key={i}>
                      <td>{t.topic}</td>
                      <td>
                        <span className={styles.scoreCell}>{t.score}/10</span>
                      </td>
                      <td>{t.comment || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className={styles.twoCol}>
          {strengths.length > 0 && (
            <section className={`${styles.section} ${styles.strengthsCard}`}>
              <h2>Strengths</h2>
              <ul className={styles.bulletList}>
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}

          {weaknesses.length > 0 && (
            <section className={`${styles.section} ${styles.weaknessesCard}`}>
              <h2>Areas to Improve</h2>
              <ul className={styles.bulletList}>
                {weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {actionPlan.length > 0 && (
          <section className={styles.section}>
            <h2>Action Plan</h2>
            <ol className={styles.actionList}>
              {actionPlan.map((a, i) => (
                <li key={i}>
                  <div className={styles.actionTip}>{a.tip}</div>
                  {a.resource && (
                    <div className={styles.actionResource}>📚 {a.resource}</div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className={styles.section}>
          <button
            type="button"
            className={styles.transcriptToggle}
            onClick={() => setTranscriptOpen((v) => !v)}
            aria-expanded={transcriptOpen}
          >
            {transcriptOpen ? "▼" : "▶"} View Full Transcript
          </button>
          {transcriptOpen && (
            <pre className={styles.transcriptBody}>{plainText}</pre>
          )}
        </section>

        <div className={styles.actions}>
          <button className="btn-primary" onClick={handleTryAgain}>
            Try Again
          </button>
          <button className="btn-secondary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy Report"}
          </button>
          <button className="btn-secondary" onClick={handleShare}>
            Share on LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}
