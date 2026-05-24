import React from "react";
import styles from "./ProgressBar.module.css";

function dotClass(done, active, score) {
  if (active) return styles.dotActive;
  if (!done) return styles.dotFuture;
  if (score >= 8) return styles.dotGreen;
  if (score >= 5) return styles.dotAmber;
  return styles.dotRed;
}

function dotContent(done, active, score, index) {
  if (active) return index + 1;
  if (!done) return index + 1;
  if (score >= 8) return "✓";
  if (score >= 5) return "~";
  return "✗";
}

export default function ProgressBar({ topics, currentIndex, scores }) {
  return (
    <div
      className={styles.wrap}
      role="progressbar"
      aria-valuenow={currentIndex}
      aria-valuemin={0}
      aria-valuemax={topics.length}
      aria-label={`Topic ${Math.min(currentIndex + 1, topics.length)} of ${topics.length}`}
    >
      {topics.map((topic, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const score = scores[i];
        return (
          <React.Fragment key={topic}>
            <div className={styles.step}>
              <div className={`${styles.dot} ${dotClass(done, active, score)}`}>
                {dotContent(done, active, score, i)}
              </div>
              <span className={styles.label}>{topic}</span>
            </div>
            {i < topics.length - 1 && (
              <div
                className={`${styles.connector} ${done ? styles.connectorDone : ""}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
