export const ROLE_TOPICS = {
  "Python Developer": ["Core Python", "OOP", "APIs & REST", "Databases", "System Design", "Behavioral"],
  "Frontend Developer": ["HTML & CSS", "JavaScript", "React", "Performance", "Accessibility", "Behavioral"],
  "Data Scientist": ["Statistics", "Python for Data", "Machine Learning", "SQL", "Data Visualization", "Behavioral"],
  "Backend Developer": ["System Design", "Databases", "APIs & REST", "Caching", "Security", "Behavioral"],
  "Full Stack Developer": ["JavaScript", "React", "Node.js", "Databases", "System Design", "Behavioral"],
  "DevOps Engineer": ["CI/CD", "Docker & Kubernetes", "Cloud (AWS/GCP)", "Monitoring", "Linux", "Behavioral"],
  "Machine Learning Engineer": ["ML Algorithms", "Deep Learning", "Python for ML", "MLOps", "System Design", "Behavioral"],
};

export const ROLES = Object.keys(ROLE_TOPICS);

export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export const INTERVIEW_TYPES = [
  { value: "technical", label: "Technical Only" },
  { value: "behavioral", label: "Behavioral Only" },
  { value: "mixed", label: "Mixed" },
];

export const SPEECH_RATES = [
  { value: 0.7, label: "Slow" },
  { value: 1.0, label: "Normal" },
  { value: 1.3, label: "Fast" },
];
