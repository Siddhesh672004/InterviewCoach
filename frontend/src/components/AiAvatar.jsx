import styles from "./AiAvatar.module.css";

export default function AiAvatar({ isSpeaking }) {
  return (
    <div className={styles.container}>
      <div className={`${styles.bars} ${isSpeaking ? styles.speaking : ""}`}>
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
      </div>
      <p className={styles.status}>
        {isSpeaking ? "Interviewer is speaking..." : "Waiting for you..."}
      </p>
    </div>
  );
}
