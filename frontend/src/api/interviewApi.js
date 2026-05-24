import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001",
  timeout: 60000,
});

export const startInterview = (payload) =>
  api.post("/start", payload).then((r) => r.data);

export const submitAnswer = (sessionId, answer) =>
  api.post("/answer", { session_id: sessionId, answer }).then((r) => r.data);

export const getReport = (sessionId) =>
  api.get(`/report/${sessionId}`).then((r) => r.data);

export const checkHealth = () => api.get("/health").then((r) => r.data);

export const uploadResume = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post("/upload-resume", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 90000,
    })
    .then((r) => r.data);
};

export const parseJobDescription = (jdText) =>
  api.post("/parse-jd", { jd_text: jdText }).then((r) => r.data);

export const suggestTopics = (payload) =>
  api.post("/suggest-topics", payload).then((r) => r.data);
