import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import BrandedLoader from "./components/BrandedLoader";

// Route-based code splitting — setiap halaman hanya dimuat saat dibutuhkan.
const lazyPage = (factory: () => Promise<{ default: React.ComponentType }>) =>
  lazy(factory);
const namedLazy = <T extends React.ComponentType>(
  factory: () => Promise<Record<string, unknown>>,
  name: string,
) =>
  lazy(() =>
    factory().then((m) => ({ default: m[name] as T })),
  );

const ChartOfAccounts = lazyPage(() => import("./pages/ChartOfAccounts"));
const AuthPage = lazyPage(() => import("./pages/AuthPage"));
const DashboardPage = lazyPage(() => import("./pages/DashboardPage"));
const JournalEntryPage = lazyPage(() => import("./pages/JournalEntryPage"));
const BukuBesarPage = lazyPage(() => import("./pages/BukuBesarPage"));
const IncomeStatementPage = namedLazy(
  () => import("./pages/IncomeStatementPage"),
  "IncomeStatementPage",
);
const BalanceSheet = lazyPage(() => import("./pages/BalanceSheet"));
const PeriodManagement = lazyPage(() => import("./pages/PeriodManagement"));
const CashFlowPage = lazyPage(() => import("./pages/CashFlowPage"));
const AuthCallback = lazyPage(() => import("./pages/AuthCallback"));
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"));
const SettingsPage = lazyPage(() => import("./pages/SettingsPage"));
const HelpCenterPage = lazyPage(() => import("./pages/HelpCenterPage"));
const PublicHelpPage = lazyPage(() => import("./pages/PublicHelpPage"));
const PricingPage = lazyPage(() => import("./pages/PricingPage"));
const MarketingPage = lazyPage(() => import("./pages/MarketingPage"));
const MarketingDetailPage = lazyPage(() =>
  import("./pages/MarketingDetailPage"),
);
const SolutionDetailPage = lazyPage(() => import("./pages/SolutionDetailPage"));
const ProductDetailPage = lazyPage(() => import("./pages/ProductDetailPage"));
const PaymentResultPage = lazyPage(() => import("./pages/PaymentResultPage"));
const ForgotPasswordPage = lazyPage(() =>
  import("./pages/ForgotPasswordPage"),
);
const ResetPasswordPage = lazyPage(() => import("./pages/ResetPasswordPage"));
const AdminGatePage = lazyPage(() => import("./pages/AdminGatePage"));
const AdminPortalPage = lazyPage(() => import("./pages/AdminPortalPage"));
const UserManagementPage = lazyPage(() =>
  import("./pages/UserManagementPage"),
);
const OnboardingPage = lazyPage(() => import("./pages/OnboardingPage"));
const AiCfoPage = lazyPage(() => import("./pages/AiCfoPage"));
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage"));
const ErrorPage = lazyPage(() => import("./pages/ErrorPage"));
const TermsPage = namedLazy(() => import("./pages/TermsPage"), "TermsPage");
import { ProtectedFeature } from "./components/ProtectedFeature";
import { AICfoFloatingButton } from "./components/AICfoFloatingButton";

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
    "/solutions/",
    "/product/",
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
    const storedTheme = localStorage.getItem("theme");
    const root = document.documentElement;
    if (storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);
  return null;
}

/** Scroll to anchor (#demo, #features, #security) after navigation. */
function AnchorScroller() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      // Small delay to let the target section mount
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location.hash]);
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
    <Suspense fallback={<BrandedLoader />}>
      <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/solutions/:slug" element={<SolutionDetailPage />} />
      <Route path="/product/:slug" element={<ProductDetailPage />} />
      <Route path="/:section/:item" element={<MarketingDetailPage />} />
      <Route path="/:section" element={<MarketingPage />} />
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

      {/* Gerbang admin — sengaja TIDAK didaftarkan di navigasi/menu manapun.
          Hanya bisa dicapai lewat shortcut rahasia di /login. */}
      <Route path="/portal-akses" element={<AdminGatePage />} />
      <Route path="/admin-portal" element={<AdminPortalPage />} />
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
          <RoleRoute roles={["owner"]}>
            <UserManagementPage />
          </RoleRoute>
        }
      />
      <Route
        path="/period-management"
        element={
          <RoleRoute roles={["owner"]}>
            <PeriodManagement />
          </RoleRoute>
        }
      />
      <Route
        path="/chart-of-accounts"
        element={
          <RoleRoute roles={["owner", "akuntan"]}>
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
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <BrowserRouter>
        <AnchorScroller />
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
