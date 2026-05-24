import styles from "./ScoreSidebar.module.css";

function badgeClass(score) {
  if (score == null) return styles.badgeGray;
  if (score >= 8) return styles.badgeGreen;
  if (score >= 5) return styles.badgeAmber;
  return styles.badgeRed;
}

export default function ScoreSidebar({ topics, scores, currentIndex }) {
  const completed = scores.filter((s) => s != null).length;
  const total = topics.length;
  const validScores = scores.filter((s) => s != null);
  const overall = validScores.length
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
    : "—";

  return (
    <aside className={styles.sidebar} aria-label="Score tracker">
      <h2 className={styles.title}>Your Progress</h2>
      <div className={styles.summary}>
        {completed} of {total} topics completed
      </div>

      <ul className={styles.topicList}>
        {topics.map((topic, i) => {
          const score = scores[i];
          const active = i === currentIndex;
          return (
            <li
              key={topic}
              className={`${styles.topicRow} ${active ? styles.topicActive : ""}`}
            >
              <span className={styles.topicName}>{topic}</span>
              <span
                className={`${styles.badge} ${badgeClass(score)}`}
                aria-label={
                  score == null
                    ? `${topic}: not yet attempted`
                    : `${topic}: scored ${score} out of 10`
                }
              >
                {score == null ? "—" : score}
              </span>
            </li>
          );
        })}
      </ul>

      <div className={styles.overall}>
        <span>Overall Score</span>
        <strong>{overall}{validScores.length ? "/10" : ""}</strong>
      </div>
    </aside>
  );
}
