import { useState, useEffect, useRef, useCallback } from "react";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length) setVoices(list);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text, rate = 1.0, onEnd = () => {}) => {
      if (!text || !window.speechSynthesis) {
        onEnd();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      const preferred =
        voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd();
      };

      utteranceRef.current = utterance;
      // Chrome occasionally drops a speak() that lands in the same tick as
      // cancel(). A microtask defer fixes the very first utterance of the
      // session, which is exactly the case where users complain "the AI
      // didn't read the first question".
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          setIsSpeaking(false);
          onEnd();
        }
      }, 60);
    },
    [voices]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { isSpeaking, speak, stopSpeaking, voicesReady: voices.length > 0 };
}
