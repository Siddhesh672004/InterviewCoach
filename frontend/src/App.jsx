import React, { createContext, useContext, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MarketingLayout from "./components/MarketingLayout.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import FeaturesPage from "./pages/FeaturesPage.jsx";
import HowItWorksPage from "./pages/HowItWorksPage.jsx";
import PricingPage from "./pages/PricingPage.jsx";
import SetupScreen from "./pages/SetupScreen.jsx";
import InterviewScreen from "./pages/InterviewScreen.jsx";
import ReportScreen from "./pages/ReportScreen.jsx";

const InterviewContext = createContext(null);
export const useInterview = () => {
  const ctx = useContext(InterviewContext);
  if (!ctx) throw new Error("useInterview must be used within InterviewContext");
  return ctx;
};

export default function App() {
  const [session, setSession] = useState(null);
  const [setupConfig, setSetupConfig] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [resumeData, setResumeData] = useState(null); // { resume_text, resume_summary }
  const [jdData, setJdData] = useState(null);         // { jd_text, jd_summary }

  const reset = () => {
    setSession(null);
    setSetupConfig(null);
    setFinalReport(null);
    setResumeData(null);
    setJdData(null);
  };

  const fullReset = reset;

  return (
    <InterviewContext.Provider
      value={{
        session,
        setSession,
        setupConfig,
        setSetupConfig,
        finalReport,
        setFinalReport,
        resumeData,
        setResumeData,
        jdData,
        setJdData,
        reset,
        fullReset,
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/setup" element={<SetupScreen />} />
          </Route>
          <Route
            path="/interview"
            element={session ? <InterviewScreen /> : <Navigate to="/setup" replace />}
          />
          <Route
            path="/report"
            element={finalReport ? <ReportScreen /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </InterviewContext.Provider>
  );
}
