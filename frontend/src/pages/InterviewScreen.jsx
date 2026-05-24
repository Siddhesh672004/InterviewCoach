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

  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition();

  const seededRef = useRef(false);
  const lastAnswerRef = useRef("");

  const speakIfEnabled = (text) => {
    if (voiceEnabled && synthesis.speak) {
      synthesis.speak(text, speechRate);
    }
  };

  useEffect(() => {
    if (seededRef.current || !session?.question) return;
    setMessages([{ type: "ai", content: session.question }]);
    seededRef.current = true;
    speakIfEnabled(session.question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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

  return (
    <div className={styles.page}>
      <ProgressBar topics={topics} currentIndex={currentIndex} scores={scores} />

      <button
        type="button"
        className={styles.sidebarToggle}
        onClick={() => setSidebarOpen((v) => !v)}
      >
        {sidebarOpen ? "Hide Scores" : "Show Scores"}
      </button>

      <div className={styles.layout}>
        <div className={styles.leftCol}>
          <AiAvatar isSpeaking={synthesis.isSpeaking} />
        </div>

        <div className={styles.centerCol}>
          {error && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
              <button className={styles.retryBtn} onClick={handleRetry}>
                Retry
              </button>
            </div>
          )}

          <ChatWindow messages={messages} />

          <VoiceInput
            onSubmit={handleSubmit}
            disabled={submitting}
            status={inputStatus}
            voiceEnabled={voiceEnabled}
            isAiSpeaking={synthesis.isSpeaking}
            recognition={recognition}
          />
        </div>

        <div
          className={`${styles.rightCol} ${!sidebarOpen ? styles.rightColCollapsed : ""}`}
        >
          <ScoreSidebar
            topics={topics}
            scores={scores}
            currentIndex={currentIndex}
          />
        </div>
      </div>

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
