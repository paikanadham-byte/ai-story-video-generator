import { useState, useCallback, useEffect } from "react";
import { io } from "socket.io-client";
import { supabase } from "./utils/supabase.js";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import CreateVideo from "./components/CreateVideo.jsx";
import ProgressScreen from "./components/ProgressScreen.jsx";
import VideoPreview from "./components/VideoPreview.jsx";
import VideoEditor from "./components/VideoEditor.jsx";
import CopyrightTransformer from "./components/CopyrightTransformer.jsx";
import ProFeatures from "./components/ProFeatures.jsx";
import ApiAccess from "./components/ApiAccess.jsx";
import VoiceCloning from "./components/VoiceCloning.jsx";
import AuthPage from "./components/AuthPage.jsx";
import Settings from "./components/Settings.jsx";
import Feedback from "./components/Feedback.jsx";
import { startGeneration } from "./api/client.js";

const STEPS = ["script", "media", "tts", "render", "concat"];
const STEP_LABELS = { script: "Script", media: "Media", tts: "Voice", render: "Render", concat: "Export" };

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [pageHistory, setPageHistory] = useState([]);
  const [subView, setSubView] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [detail, setDetail] = useState("");
  const [completedSteps, setCompletedSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appLang, setAppLang] = useState(() => localStorage.getItem("sf_lang") || "en");

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Set RTL for Persian/Arabic
  useEffect(() => {
    const rtl = appLang === "fa" || appLang === "ar";
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = appLang;
    localStorage.setItem("sf_lang", appLang);
  }, [appLang]);

  const handleGenerate = useCallback(async (formData) => {
    setError(null);
    setSubView("progress");
    setProgress(0);
    setCurrentStep("script");
    setDetail("Starting...");
    setCompletedSteps([]);
    setResult(null);

    try {
      const { jobId } = await startGeneration(formData);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || undefined;
      const socket = io(backendUrl, { transports: ["websocket", "polling"] });

      socket.on("connect", () => socket.emit("subscribe", jobId));

      socket.on("progress", (data) => {
        setProgress(data.progress || 0);
        setCurrentStep(data.step || "");
        setDetail(data.detail || "");
        const idx = STEPS.indexOf(data.step);
        if (idx > 0) setCompletedSteps(STEPS.slice(0, idx));
      });

      socket.on("complete", (data) => {
        setCompletedSteps([...STEPS]);
        setProgress(100);
        setResult(data);
        setSubView("preview");
        socket.disconnect();
      });

      socket.on("error", (data) => {
        setError(data.error || "Generation failed");
        setSubView(null);
        socket.disconnect();
      });
    } catch (err) {
      setError(err.message);
      setSubView(null);
    }
  }, []);

  const handleReset = useCallback(() => {
    setSubView(null);
    setError(null);
    setResult(null);
    setProgress(0);
  }, []);

  const navigateTo = useCallback((p) => {
    setPageHistory((prev) => [...prev, page]);
    setPage(p);
    setSubView(null);
    setError(null);
  }, [page]);

  const goBack = useCallback(() => {
    if (subView) {
      setSubView(null);
      return;
    }
    setPageHistory((prev) => {
      const newHistory = [...prev];
      const prevPage = newHistory.pop() || "dashboard";
      setPage(prevPage);
      return newHistory;
    });
    setError(null);
  }, [subView]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPage("dashboard");
  }, []);

  const showBackBtn = page !== "dashboard" || subView;

  const renderPage = () => {
    if (page === "create") {
      if (subView === "progress") {
        return (
          <ProgressScreen
            progress={progress}
            currentStep={currentStep}
            detail={detail}
            completedSteps={completedSteps}
            steps={STEPS}
            stepLabels={STEP_LABELS}
          />
        );
      }
      if (subView === "preview" && result) {
        return <VideoPreview result={result} onReset={handleReset} />;
      }
      return <CreateVideo onGenerate={handleGenerate} error={error} />;
    }
    if (page === "editor") return <VideoEditor />;
    if (page === "copyright") return <CopyrightTransformer />;
    if (page === "pro") return <ProFeatures />;
    if (page === "api") return <ApiAccess />;
    if (page === "voice-clone") return <VoiceCloning />;
    if (page === "settings") return <Settings user={session.user} onSignOut={handleSignOut} appLang={appLang} onChangeLang={setAppLang} />;
    if (page === "feedback") return <Feedback />;
    return <Dashboard onNavigate={navigateTo} />;
  };

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage onAuth={(s) => setSession(s)} />;
  }

  return (
    <div className="layout">
      <Sidebar
        activePage={page}
        onNavigate={navigateTo}
        user={session.user}
        onSignOut={handleSignOut}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        {showBackBtn ? (
          <button className="mobile-back-btn" onClick={goBack}>← Back</button>
        ) : (
          <div className="mobile-brand">🎬 StoryForge</div>
        )}
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>☰</button>
      </div>

      <main className="main-content">
        {/* Desktop back button */}
        {showBackBtn && (
          <div className="desktop-back-bar">
            <button className="back-btn" onClick={goBack}>← Back</button>
          </div>
        )}
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
