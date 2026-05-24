import { useEffect, useRef } from "react";
import styles from "./ChatWindow.module.css";

function bubbleClass(type, score) {
  if (type === "ai") return styles.aiBubble;
  if (type === "user") return styles.userBubble;
  if (type === "system") return styles.systemBubble;
  if (type === "feedback") {
    if (score >= 8) return `${styles.feedbackBubble} ${styles.feedbackPositive}`;
    if (score >= 5) return `${styles.feedbackBubble} ${styles.feedbackNeutral}`;
    return `${styles.feedbackBubble} ${styles.feedbackNegative}`;
  }
  return "";
}

export default function ChatWindow({ messages }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className={styles.window} role="log" aria-live="polite">
      {messages.length === 0 && (
        <div className={styles.empty}>The interview will start in a moment...</div>
      )}
      {messages.map((m, i) => {
        if (m.type === "system") {
          return (
            <div key={i} className={styles.systemRow}>
              <span className={styles.systemBubble}>{m.content}</span>
            </div>
          );
        }
        const fromAi = m.type === "ai" || m.type === "feedback";
        return (
          <div
            key={i}
            className={`${styles.row} ${fromAi ? styles.rowLeft : styles.rowRight}`}
          >
            {fromAi && <div className={styles.avatarAi} aria-hidden="true">AI</div>}
            <div className={bubbleClass(m.type, m.score)}>
              {m.type === "feedback" && (
                <div className={styles.scoreLine}>
                  Score: {m.score}/10
                </div>
              )}
              <div>{m.content}</div>
            </div>
            {!fromAi && <div className={styles.avatarUser} aria-hidden="true">You</div>}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
