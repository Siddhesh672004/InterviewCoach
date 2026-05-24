import { useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInterview } from "../App.jsx";
import {
  startInterview,
  uploadResume,
  parseJobDescription,
  suggestTopics,
} from "../api/interviewApi.js";
import {
  ROLES,
  ROLE_TOPICS,
  DIFFICULTIES,
  INTERVIEW_TYPES,
  SPEECH_RATES,
} from "../data/topics.js";
import styles from "./SetupScreen.module.css";

const MODES = [
  {
    id: "quick",
    icon: "⚡",
    name: "Quick Practice",
    desc: "Pick a role and topics. Fastest start, no setup.",
  },
  {
    id: "resume_driven",
    icon: "📄",
    name: "Resume-Driven",
    desc: "Upload your resume. AI grills you on your projects.",
  },
  {
    id: "jd_targeted",
    icon: "📋",
    name: "JD-Targeted",
    desc: "Paste a JD. AI matches questions to the role's must-haves.",
  },
  {
    id: "hr_behavioral",
    icon: "🤝",
    name: "HR / Behavioral",
    desc: "Soft skills, motivation, conflict, culture-fit rounds.",
  },
];

const browserSupportsSpeech = () =>
  typeof window !== "undefined" &&
  Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

const formatBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

export default function SetupScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    setSession,
    setSetupConfig,
    resumeData,
    setResumeData,
    jdData,
    setJdData,
  } = useInterview();

  const speechSupported = useMemo(browserSupportsSpeech, []);
  const initialMode = searchParams.get("mode") || "quick";

  const [mode, setMode] = useState(
    MODES.find((m) => m.id === initialMode) ? initialMode : "quick"
  );
  const [role, setRole] = useState(ROLES[0]);
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [interviewType, setInterviewType] = useState("mixed");
  const [topics, setTopics] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(speechSupported);
  const [speechRate, setSpeechRate] = useState(1.0);

  // Resume upload state
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // JD state
  const [jdText, setJdText] = useState("");
  const [jdParsing, setJdParsing] = useState(false);
  const [jdError, setJdError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableTopics = ROLE_TOPICS[role] || [];
  const showResumeBlock = mode === "resume_driven";
  const showJdBlock = mode === "jd_targeted";
  const showRoleBlock = mode !== "jd_targeted" || !jdData;

  const valid = topics.length >= 2 && topics.length <= 4;

  // ── Resume upload ────────────────────────────────────────────────

  const handleResumeFile = async (file) => {
    if (!file) return;
    const allowed = [".pdf", ".docx", ".doc", ".txt"];
    const ok = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!ok) {
      setResumeError("Upload a PDF, DOCX, DOC, or TXT file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("File too large. Max 5 MB.");
      return;
    }

    setResumeError("");
    setResumeFile(file);
    setResumeUploading(true);
    try {
      const data = await uploadResume(file);
      setResumeData({
        resume_text: data.resume_text,
        resume_summary: data.resume_summary,
        chars: data.chars,
        filename: file.name,
        size: file.size,
      });

      // Auto-suggest topics if user hasn't picked any
      if (topics.length === 0) {
        try {
          const sug = await suggestTopics({
            role,
            mode,
            resume_summary: data.resume_summary,
            jd_summary: jdData?.jd_summary,
          });
          if (sug.topics?.length) {
            const overlap = sug.topics.filter((t) => availableTopics.includes(t));
            const final = overlap.length >= 2 ? overlap.slice(0, 4) : availableTopics.slice(0, 3);
            setTopics(final);
          }
        } catch (e) {
          // Suggestion is optional — silently fall back
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not parse resume.";
      setResumeError(msg);
      setResumeFile(null);
    } finally {
      setResumeUploading(false);
    }
  };

  const removeResume = () => {
    setResumeFile(null);
    setResumeData(null);
    setResumeError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = () => setDragActive(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleResumeFile(file);
  };

  // ── JD parse ─────────────────────────────────────────────────────

  const handleParseJd = async () => {
    if (!jdText.trim() || jdText.trim().length < 30) {
      setJdError("Paste at least a few sentences from the JD.");
      return;
    }
    setJdError("");
    setJdParsing(true);
    try {
      const data = await parseJobDescription(jdText.trim());
      setJdData({
        jd_text: data.jd_text,
        jd_summary: data.jd_summary,
        chars: data.chars,
      });

      if (topics.length === 0) {
        try {
          const sug = await suggestTopics({
            role,
            mode,
            resume_summary: resumeData?.resume_summary,
            jd_summary: data.jd_summary,
          });
          if (sug.topics?.length) {
            const overlap = sug.topics.filter((t) => availableTopics.includes(t));
            const final = overlap.length >= 2 ? overlap.slice(0, 4) : availableTopics.slice(0, 3);
            setTopics(final);
          }
        } catch (e) {
          // optional
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not parse job description.";
      setJdError(msg);
    } finally {
      setJdParsing(false);
    }
  };

  const clearJd = () => {
    setJdData(null);
    setJdText("");
    setJdError("");
  };

  // ── Topic toggling ──────────────────────────────────────────────

  const toggleTopic = (topic) => {
    setTopics((prev) => {
      if (prev.includes(topic)) return prev.filter((t) => t !== topic);
      if (prev.length >= 4) return prev;
      return [...prev, topic];
    });
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setTopics([]);
  };

  // ── Submit ──────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      // Per-mode isolation: only forward context the mode actually uses, so
      // a stale resume from an earlier session never leaks into a Quick or
      // HR run. App.jsx clears state on reset, but this is the safety net.
      const useResume = mode === "resume_driven";
      const useJd = mode === "jd_targeted";
      const payload = {
        role,
        difficulty: difficulty.toLowerCase(),
        topics,
        interview_type: interviewType,
        voice_enabled: voiceEnabled,
        speech_rate: speechRate,
        mode,
        resume_text: useResume ? resumeData?.resume_text || null : null,
        resume_summary: useResume ? resumeData?.resume_summary || null : null,
        jd_text: useJd ? jdData?.jd_text || null : null,
        jd_summary: useJd ? jdData?.jd_summary || null : null,
      };
      const data = await startInterview(payload);
      setSetupConfig(payload);
      setSession({
        sessionId: data.session_id,
        question: data.question,
        topic: data.topic,
        topicIndex: data.topic_index,
        totalTopics: data.total_topics,
        topics,
        voiceEnabled: data.voice_enabled,
        speechRate: data.speech_rate,
        mode: data.mode,
      });
      navigate("/interview");
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not start interview. Is the backend running?";
      setError(message);
      setSubmitting(false);
    }
  };

  // ── Step bar progress ───────────────────────────────────────────

  const stepProgress = useMemo(() => {
    let step = 1;
    if (mode) step = 2;
    if (
      (mode === "resume_driven" && resumeData) ||
      (mode === "jd_targeted" && jdData) ||
      (mode === "quick" || mode === "hr_behavioral")
    ) {
      step = 3;
    }
    if (valid) step = 4;
    return step;
  }, [mode, resumeData, jdData, valid]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.header}>
          <span className={styles.headerBadge}>Set up your session</span>
          <h1>Configure your interview</h1>
          <p>Pick a mode, add context if you have it, and pick your topics. ~60 seconds.</p>
        </div>

        <div className={styles.stepBar}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`${styles.stepDot} ${
                stepProgress === n ? styles.stepDotActive : ""
              } ${stepProgress > n ? styles.stepDotDone : ""}`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Mode picker ───────────────────────────────────── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Choose your mode</h2>
            <p className={styles.cardSubtitle}>How should the AI tailor questions?</p>
            <div className={styles.modeGrid}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.modeOption} ${mode === m.id ? styles.modeOptionActive : ""}`}
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                >
                  <span className={styles.modeIcon}>{m.icon}</span>
                  <div className={styles.modeName}>{m.name}</div>
                  <div className={styles.modeDesc}>{m.desc}</div>
                  <span className={styles.modeCheck}>✓</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Resume block (resume_driven mode) ─────────────── */}
          {showResumeBlock && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Upload your resume</h2>
              <p className={styles.cardSubtitle}>
                PDF or DOCX. Max 5 MB. Processed in-memory — never stored.
              </p>

              {!resumeData ? (
                <div
                  className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  <span className={styles.dropZoneIcon} aria-hidden="true">📄</span>
                  <div className={styles.dropZoneText}>
                    {resumeUploading ? "Uploading and parsing..." : "Drop your resume or click to browse"}
                  </div>
                  <div className={styles.dropZoneHint}>PDF · DOCX · DOC · TXT</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,application/pdf"
                    className={styles.fileInput}
                    onChange={(e) => handleResumeFile(e.target.files?.[0])}
                    disabled={resumeUploading}
                  />
                </div>
              ) : (
                <div className={styles.uploadedCard}>
                  <div className={styles.uploadedIcon}>✓</div>
                  <div className={styles.uploadedInfo}>
                    <div className={styles.uploadedName}>
                      {resumeData.filename || "Resume parsed"}
                    </div>
                    <div className={styles.uploadedMeta}>
                      {resumeData.size ? formatBytes(resumeData.size) + " · " : ""}
                      {resumeData.chars} characters extracted
                    </div>
                  </div>
                  <button type="button" className={styles.uploadedRemove} onClick={removeResume}>
                    Remove
                  </button>
                </div>
              )}

              {resumeData?.resume_summary && (
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Detected role</div>
                    <div className={styles.summaryValue}>
                      {resumeData.resume_summary.current_role || "—"}
                    </div>
                  </div>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Years experience</div>
                    <div className={styles.summaryValue}>
                      {resumeData.resume_summary.years_experience ?? "—"}
                    </div>
                  </div>
                  <div className={styles.summaryItem} style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.summaryLabel}>Top skills</div>
                    <div>
                      {(resumeData.resume_summary.top_skills || []).slice(0, 8).map((s) => (
                        <span key={s} className={styles.skillTag}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {resumeError && <div className={styles.errorInline} style={{ marginTop: 12 }}>{resumeError}</div>}
            </div>
          )}

          {/* ── JD block (jd_targeted mode) ──────────────────── */}
          {showJdBlock && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Paste the job description</h2>
              <p className={styles.cardSubtitle}>
                We'll extract must-haves, seniority, and focus areas to shape the questions.
              </p>

              {!jdData ? (
                <>
                  <textarea
                    className={styles.textarea}
                    rows={8}
                    placeholder="Paste the full job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    disabled={jdParsing}
                  />
                  {jdError && <div className={styles.errorInline} style={{ marginTop: 8 }}>{jdError}</div>}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleParseJd}
                    disabled={jdParsing || !jdText.trim()}
                    style={{ marginTop: 14 }}
                  >
                    {jdParsing ? <><span className={styles.spinner} /> Analyzing...</> : "Analyze JD"}
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.uploadedCard}>
                    <div className={styles.uploadedIcon}>✓</div>
                    <div className={styles.uploadedInfo}>
                      <div className={styles.uploadedName}>
                        {jdData.jd_summary?.job_title || "Job description analyzed"}
                      </div>
                      <div className={styles.uploadedMeta}>
                        {jdData.chars} characters · seniority: {jdData.jd_summary?.seniority || "—"}
                      </div>
                    </div>
                    <button type="button" className={styles.uploadedRemove} onClick={clearJd}>
                      Clear
                    </button>
                  </div>

                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryItem} style={{ gridColumn: "1 / -1" }}>
                      <div className={styles.summaryLabel}>Required skills</div>
                      <div>
                        {(jdData.jd_summary?.required_skills || []).slice(0, 8).map((s) => (
                          <span key={s} className={styles.skillTag}>{s}</span>
                        ))}
                      </div>
                    </div>
                    {jdData.jd_summary?.focus_areas?.length > 0 && (
                      <div className={styles.summaryItem} style={{ gridColumn: "1 / -1" }}>
                        <div className={styles.summaryLabel}>Focus areas</div>
                        <div>
                          {jdData.jd_summary.focus_areas.slice(0, 5).map((s) => (
                            <span key={s} className={styles.skillTag}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Role + topics ─────────────────────────────────── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Role &amp; topics</h2>
            <p className={styles.cardSubtitle}>Pick 2 to 4 topics for this session.</p>

            <div className={styles.field}>
              <label htmlFor="role">Target role</label>
              <select
                id="role"
                className={styles.select}
                value={role}
                onChange={handleRoleChange}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <label>Difficulty</label>
              <div className={styles.radioGroup}>
                {DIFFICULTIES.map((d) => (
                  <label key={d} className={styles.radio}>
                    <input
                      type="radio"
                      name="difficulty"
                      value={d}
                      checked={difficulty === d}
                      onChange={(e) => setDifficulty(e.target.value)}
                    />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>
                Topics <span className={styles.hint}>({topics.length}/4 — pick 2–4)</span>
              </label>
              <div className={styles.topicGrid}>
                {availableTopics.map((t) => {
                  const checked = topics.includes(t);
                  const disabled = !checked && topics.length >= 4;
                  return (
                    <label
                      key={t}
                      className={`${styles.checkbox} ${checked ? styles.checked : ""} ${
                        disabled ? styles.disabled : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTopic(t)}
                        disabled={disabled}
                      />
                      <span>{t}</span>
                    </label>
                  );
                })}
              </div>
              {topics.length > 0 && topics.length < 2 && (
                <p className={styles.errorInline}>Please pick at least 2 topics.</p>
              )}
            </div>

            <div className={styles.field}>
              <label>Interview type</label>
              <div className={styles.radioGroup}>
                {INTERVIEW_TYPES.map((it) => (
                  <label key={it.value} className={styles.radio}>
                    <input
                      type="radio"
                      name="interview_type"
                      value={it.value}
                      checked={interviewType === it.value}
                      onChange={(e) => setInterviewType(e.target.value)}
                    />
                    <span>{it.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Voice settings ────────────────────────────────── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Voice settings</h2>
            <p className={styles.cardSubtitle}>Skip this section to interview by text only.</p>

            <div className={styles.field}>
              <label className={styles.toggleLabel}>
                <span>
                  Voice mode
                  {!speechSupported && (
                    <span className={styles.hint}> (requires Chrome or Edge)</span>
                  )}
                </span>
                <button
                  type="button"
                  className={`${styles.toggle} ${voiceEnabled ? styles.toggleOn : ""}`}
                  onClick={() => speechSupported && setVoiceEnabled((v) => !v)}
                  disabled={!speechSupported}
                  aria-pressed={voiceEnabled}
                  aria-label="Toggle voice mode"
                >
                  <span className={styles.toggleKnob} />
                </button>
              </label>
            </div>

            <div className={styles.field}>
              <label>Interviewer speed</label>
              <div className={styles.speedRow}>
                {SPEECH_RATES.map((sr) => (
                  <button
                    type="button"
                    key={sr.value}
                    className={`${styles.speedBtn} ${
                      speechRate === sr.value ? styles.speedBtnActive : ""
                    }`}
                    onClick={() => setSpeechRate(sr.value)}
                  >
                    {sr.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate("/")}
            >
              ← Back
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!valid || submitting}
              style={{ fontSize: 16, padding: "14px 36px" }}
            >
              {submitting ? (
                <><span className={styles.spinner} /> Starting...</>
              ) : (
                "Begin interview →"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
