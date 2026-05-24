import { useState, useEffect } from "react";
import styles from "./VoiceInput.module.css";

export default function VoiceInput({
  onSubmit,
  disabled,
  status,
  voiceEnabled,
  isAiSpeaking,
  recognition,
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (recognition?.transcript && voiceEnabled) {
      setText(recognition.transcript);
    }
  }, [recognition?.transcript, voiceEnabled]);

  const canSubmit = !disabled && !isAiSpeaking && text.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const value = text.trim();
    setText("");
    recognition?.setTranscript?.("");
    onSubmit(value);
  };

  const handleMicClick = () => {
    if (!recognition) return;
    if (recognition.isListening) {
      recognition.stopListening();
    } else {
      setText("");
      recognition.startListening();
    }
  };

  const showMic = voiceEnabled && recognition;

  return (
    <form className={styles.bar} onSubmit={handleSubmit}>
      {status && <div className={styles.status}>{status}</div>}

      <div className={styles.inputRow}>
        {showMic && (
          <button
            type="button"
            className={`${styles.micBtn} ${recognition.isListening ? styles.micListening : ""}`}
            onClick={handleMicClick}
            disabled={disabled || isAiSpeaking}
            aria-label={recognition.isListening ? "Stop listening" : "Start listening"}
            title={recognition.isListening ? "Stop listening" : "Click to speak"}
          >
            {recognition.isListening ? (
              <span className={styles.recordingDot} />
            ) : (
              <span aria-hidden="true">🎙️</span>
            )}
          </button>
        )}

        <textarea
          className={styles.textarea}
          placeholder={
            isAiSpeaking
              ? "AI is speaking..."
              : recognition?.isListening
              ? "Listening... speak now"
              : "Type your answer or click the mic"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || isAiSpeaking}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        <button
          type="submit"
          className="btn-primary"
          disabled={!canSubmit}
          style={{ alignSelf: "stretch", padding: "0 22px" }}
        >
          Submit
        </button>
      </div>
    </form>
  );
}
