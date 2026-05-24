import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { to: "/features", label: "Features" },
      { to: "/how-it-works", label: "How it works" },
      { to: "/pricing", label: "Pricing" },
      { to: "/setup", label: "Start interview" },
    ],
  },
  {
    title: "Modes",
    links: [
      { to: "/setup?mode=technical", label: "Technical" },
      { to: "/setup?mode=resume_driven", label: "Resume-driven" },
      { to: "/setup?mode=jd_targeted", label: "JD-targeted" },
      { to: "/setup?mode=hr_behavioral", label: "HR / Behavioral" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/how-it-works", label: "Interview tips" },
      { to: "/features", label: "Sample questions" },
      { to: "#", label: "Blog" },
      { to: "#", label: "Help center" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <Link to="/" className={styles.brand}>
              MockMind<span className={styles.brandAccent}> AI</span>
            </Link>
            <p className={styles.tagline}>
              Personalized AI mock interviews. Built to help you land the role —
              completely free.
            </p>
            <div className={styles.socials} aria-label="Social links">
              <a href="#" aria-label="GitHub" className={styles.socialLink}>GH</a>
              <a href="#" aria-label="LinkedIn" className={styles.socialLink}>in</a>
              <a href="#" aria-label="Twitter / X" className={styles.socialLink}>X</a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className={styles.col}>
              <h4 className={styles.colTitle}>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to.startsWith("#") ? (
                      <a href={l.to}>{l.label}</a>
                    ) : (
                      <Link to={l.to}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} MockMind AI. Built with LangGraph, FastAPI, and React.</span>
          <div className={styles.legal}>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
