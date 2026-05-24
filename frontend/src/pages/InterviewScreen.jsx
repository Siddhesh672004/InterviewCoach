import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useInterview } from "../App.jsx";
import { submitAnswer } from "../api/interviewApi.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import AiAvatar from "../components/AiAvatar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import VoiceInput from "../components/VoiceInput.jsx";
import ScoreSidebar from "../components/ScoreSidebar.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import styles from "./InterviewScreen.module.css";

const MODE_LABEL = {
  quick: "Quick Practice",
  technical: "Technical",
  resume_driven: "Resume-Driven",
  jd_targeted: "JD-Targeted",
  hr_behavioral: "HR / Behavioral",
};

export default function InterviewScreen() {
  const navigate = useNavigate();
  const { session, setFinalReport } = useInterview();

  const topics = session?.topics || [];
  const voiceEnabled = Boolean(session?.voiceEnabled);
  const speechRate = session?.speechRate || 1.0;

  const [messages, setMessages] = useState([]);
  const [scores, setScores] = useState(() => topics.map(() => null));
  const [currentIndex, setCurrentIndex] = useState(session?.topicIndex || 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition();

  const seededRef = useRef(false);
  const pendingFirstQuestionRef = useRef(null);
  const lastAnswerRef = useRef("");
  const startedAtRef = useRef(Date.now());

  const speakIfEnabled = (text) => {
    if (voiceEnabled && synthesis.speak) {
      synthesis.speak(text, speechRate);
    }
  };

  // Seed first question + handle the TTS race: if voices haven't loaded yet,
  // queue the question and speak it as soon as voicesReady flips true.
  useEffect(() => {
    if (seededRef.current || !session?.question) return;
    setMessages([{ type: "ai", content: session.question }]);
    seededRef.current = true;

    if (!voiceEnabled) return;
    if (synthesis.voicesReady) {
      speakIfEnabled(session.question);
    } else {
      pendingFirstQuestionRef.current = session.question;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (synthesis.voicesReady && pendingFirstQuestionRef.current) {
      const q = pendingFirstQuestionRef.current;
      pendingFirstQuestionRef.current = null;
      speakIfEnabled(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synthesis.voicesReady, voiceEnabled]);

  useEffect(() => {
    if (recognition.error) {
      setToast(recognition.error);
      recognition.clearError();
    }
  }, [recognition.error]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      synthesis.stopSpeaking?.();
      recognition.stopListening?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (answer) => {
    if (!answer.trim() || submitting) return;
    if (recognition.isListening) recognition.stopListening();

    lastAnswerRef.current = answer;
    setError("");
    setSubmitting(true);

    setMessages((prev) => [...prev, { type: "user", content: answer }]);

    try {
      const data = await submitAnswer(session.sessionId, answer);

      setMessages((prev) => [
        ...prev,
        { type: "feedback", content: data.feedback, score: data.score },
      ]);

      const indexAtTime = currentIndex;
      setScores((prev) => {
        const next = [...prev];
        if (indexAtTime < next.length) next[indexAtTime] = data.score;
        return next;
      });

      if (data.is_done && data.final_report) {
        setFinalReport(data.final_report);
        setTimeout(() => navigate("/report"), 800);
        return;
      }

      if (data.topic_changed) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        if (data.next_topic) {
          setMessages((prev) => [
            ...prev,
            { type: "system", content: `Moving to next topic: ${data.next_topic}` },
          ]);
        }
      }

      if (data.next_question) {
        setMessages((prev) => [...prev, { type: "ai", content: data.next_question }]);
        speakIfEnabled(data.next_question);
      }
    } catch (err) {
      const code = err?.code;
      const message =
        err?.response?.data?.detail ||
        (code === "ECONNABORTED"
          ? "AI is taking too long. Please try again."
          : "Something went wrong. Please try again.");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setError("");
    if (lastAnswerRef.current) {
      handleSubmit(lastAnswerRef.current);
    }
  };

  if (!session) return null;

  let inputStatus = null;
  if (submitting) inputStatus = "AI is evaluating...";
  else if (synthesis.isSpeaking) inputStatus = "AI is speaking...";
  else if (recognition.isListening) inputStatus = "Listening... speak now";

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const r = (s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  };

  const currentTopic = topics[currentIndex] || "";
  const liveStatus = synthesis.isSpeaking
    ? { dot: styles.dotPurple, label: "Interviewer speaking" }
    : submitting
    ? { dot: styles.dotAmber, label: "Evaluating answer" }
    : recognition.isListening
    ? { dot: styles.dotGreen, label: "Listening" }
    : { dot: styles.dotIdle, label: "Ready" };

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brandRow}>
            <button
              type="button"
              className={styles.exitBtn}
              onClick={() => navigate("/")}
              aria-label="Exit interview"
            >
              ←
            </button>
            <div>
              <div className={styles.brandTitle}>Live Interview</div>
              <div className={styles.brandSub}>
                {MODE_LABEL[session.mode] || session.mode} · {session.role || "Practice"}
              </div>
            </div>
          </div>

          <div className={styles.topMeta}>
            <div className={styles.metaPill}>
              <span className={styles.metaLabel}>Topic</span>
              <span className={styles.metaValue}>{currentTopic || "—"}</span>
            </div>
            <div className={styles.metaPill}>
              <span className={styles.metaLabel}>Progress</span>
              <span className={styles.metaValue}>
                {Math.min(currentIndex + 1, topics.length)} / {topics.length}
              </span>
            </div>
            <div className={styles.metaPill}>
              <span className={styles.metaLabel}>Elapsed</span>
              <span className={styles.metaValue}>{fmt(elapsed)}</span>
            </div>
            <div className={`${styles.statusPill}`}>
              <span className={`${styles.statusDot} ${liveStatus.dot}`} />
              <span>{liveStatus.label}</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.sidebarToggle}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-pressed={sidebarOpen}
          >
            {sidebarOpen ? "Hide scores" : "Show scores"}
          </button>
        </div>

        <ProgressBar topics={topics} currentIndex={currentIndex} scores={scores} />
      </header>

      <div className={styles.layout}>
        <aside className={styles.leftCol}>
          <div className={styles.avatarCard}>
            <AiAvatar isSpeaking={synthesis.isSpeaking} />
            <div className={styles.avatarName}>AI Interviewer</div>
            <div className={styles.avatarRole}>
              {MODE_LABEL[session.mode] || "Practice"} round
            </div>
            <div className={styles.avatarStatus}>
              <span className={`${styles.statusDot} ${liveStatus.dot}`} />
              <span>{liveStatus.label}</span>
            </div>
          </div>

          <div className={styles.tipsCard}>
            <div className={styles.tipsTitle}>Pro tips</div>
            <ul className={styles.tipsList}>
              <li>Use the STAR framework: Situation, Task, Action, Result.</li>
              <li>Pause to think — silence is fine, rambling isn't.</li>
              <li>Quantify outcomes when you can ("cut p95 by 38%").</li>
            </ul>
          </div>
        </aside>

        <main className={styles.centerCol}>
          {error && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
              <button className={styles.retryBtn} onClick={handleRetry}>
                Retry
              </button>
            </div>
          )}

          <div className={styles.chatWrap}>
            <ChatWindow messages={messages} />
          </div>

          <div className={styles.inputDock}>
            <VoiceInput
              onSubmit={handleSubmit}
              disabled={submitting}
              status={inputStatus}
              voiceEnabled={voiceEnabled}
              isAiSpeaking={synthesis.isSpeaking}
              recognition={recognition}
            />
          </div>
        </main>

        <aside
          className={`${styles.rightCol} ${!sidebarOpen ? styles.rightColCollapsed : ""}`}
        >
          <ScoreSidebar
            topics={topics}
            scores={scores}
            currentIndex={currentIndex}
          />
        </aside>
      </div>

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
