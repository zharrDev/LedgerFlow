import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import JournalEntryPage from "./pages/JournalEntryPage";
import BukuBesarPage from "./pages/BukuBesarPage";
import { IncomeStatementPage } from "./pages/IncomeStatementPage";
import BalanceSheet from "./pages/BalanceSheet";
import PeriodManagement from "./pages/PeriodManagement";
import CashFlowPage from "./pages/CashFlowPage";
import AuthCallback from "./pages/AuthCallback";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import PublicHelpPage from "./pages/PublicHelpPage";
import PricingPage from "./pages/PricingPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UserManagementPage from "./pages/UserManagementPage";
import OnboardingPage from "./pages/OnboardingPage";
import AiCfoPage from "./pages/AiCfoPage";
import NotFoundPage from "./pages/NotFoundPage";
import ErrorPage from "./pages/ErrorPage";
import { TermsPage } from "./pages/TermsPage";
import { ProtectedFeature } from "./components/ProtectedFeature";
import { AICfoFloatingButton } from "./components/AICfoFloatingButton";
import BrandedLoader from "./components/BrandedLoader";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return <BrandedLoader />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return <BrandedLoader />;
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/** Tombol AI CFO mengambang — hanya di area aplikasi setelah login. */
function AiCfoFabGate() {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading || !token) return null;

  const { pathname } = location;
  if (pathname === "/ai-cfo") return null;

  const hiddenPrefixes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/",
    "/payment/",
    "/pricing",
    "/help",
  ];
  if (pathname === "/" || hiddenPrefixes.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return <AICfoFloatingButton />;
}

function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <BrandedLoader />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user?.role ?? "")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function ThemeInitializer() {
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") || "system";
    const applyTheme = (theme: string) => {
      const root = document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "light") {
        root.classList.remove("dark");
      } else if (theme === "system") {
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        if (isDark) root.classList.add("dark");
        else root.classList.remove("dark");
      }
    };
    applyTheme(storedTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (localStorage.getItem("theme") === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    const onboarded = localStorage.getItem(`onboarded_${user.id}`);
    if (!onboarded && location.pathname !== "/onboarding") {
      navigate("/onboarding", { replace: true });
    }
  }, [user, loading, location.pathname]);

  return (
    <>
      <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage initialMode="login" />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthPage initialMode="register" />
          </PublicRoute>
        }
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/help" element={<PublicHelpPage />} />
      <Route path="/terms" element={<TermsPage />} />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chart-of-accounts"
        element={
          <ProtectedRoute>
            <ChartOfAccounts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal-entries"
        element={
          <ProtectedRoute>
            <JournalEntryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buku-besar"
        element={
          <ProtectedRoute>
            <BukuBesarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/period-management"
        element={
          <ProtectedRoute>
            <PeriodManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/help-center"
        element={
          <ProtectedRoute>
            <HelpCenterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users-management"
        element={
          <RoleRoute roles={["owner", "admin"]}>
            <UserManagementPage />
          </RoleRoute>
        }
      />
      <Route
        path="/period-management"
        element={
          <RoleRoute roles={["owner", "admin"]}>
            <PeriodManagement />
          </RoleRoute>
        }
      />
      <Route
        path="/chart-of-accounts"
        element={
          <RoleRoute roles={["owner", "admin", "akuntan"]}>
            <ChartOfAccounts />
          </RoleRoute>
        }
      />

      <Route
        path="/income-statement"
        element={
          <ProtectedRoute>
            <ProtectedFeature feature="income_statement">
              <IncomeStatementPage />
            </ProtectedFeature>
          </ProtectedRoute>
        }
      />
      <Route
        path="/balance-sheet"
        element={
          <ProtectedRoute>
            <ProtectedFeature feature="balance_sheet">
              <BalanceSheet />
            </ProtectedFeature>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cash-flow"
        element={
          <ProtectedRoute>
            <ProtectedFeature feature="cash_flow">
              <CashFlowPage />
            </ProtectedFeature>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai-cfo"
        element={
          <ProtectedRoute>
            <AiCfoPage />
          </ProtectedRoute>
        }
      />

      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment/success" element={<PaymentResultPage type="success" />} />
      <Route path="/payment/pending" element={<PaymentResultPage type="pending" />} />
      <Route path="/payment/failed" element={<PaymentResultPage type="failed" />} />

      <Route path="/error/:code" element={<ErrorPage />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <AiCfoFabGate />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
