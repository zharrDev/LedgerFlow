import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import InfoPanel from "../components/InfoPanel";
import AuthFlipCard from "../components/auth/AuthFlipCard";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";

export default function AuthPage({
  initialMode,
}: {
  initialMode: "login" | "register";
}) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [isHovered, setIsHovered] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setShowUI(true);
  }, []);

  // Shortcut rahasia ke gerbang admin: Ctrl+Alt+\.
  // Sengaja tanpa indikasi visual apa pun di halaman ini.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === "\\" || e.key === "|")) {
        e.preventDefault();
        navigate("/portal-akses");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-darkBg overflow-hidden">
      {/* LEFT PANEL */}
      <div
        className="hidden lg:flex flex-col bg-gradient-to-br from-darkBg via-[#111827] to-primary-900/40 p-8 transition-all duration-500 ease-in-out relative z-10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width: isHovered ? "55%" : "42%" }}
      >
        <InfoPanel isExpanded={isHovered} />
      </div>

      {/* RIGHT FORM AREA */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative">
        <div
          className={`w-full max-w-md mx-auto transition-all duration-700 ${
            showUI ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <AuthFlipCard
            mode={mode}
            onModeChange={setMode}
            front={<LoginForm onModeChange={setMode} />}
            back={<RegisterForm onModeChange={setMode} />}
          />
        </div>
      </div>
    </div>
  );
}