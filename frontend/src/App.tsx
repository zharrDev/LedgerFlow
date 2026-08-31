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
import BrandedLoader, { RouteSuspenseFallback } from "./components/BrandedLoader";
import { AppLayout } from "./components/AppLayout";

// Route-based code splitting — setiap halaman hanya dimuat saat dibutuhkan.
const lazyPage = (factory: () => Promise<{ default: React.ComponentType }>) =>
  lazy(factory);
const lazyTyped = <P extends object>(
  factory: () => Promise<{ default: React.ComponentType<P> }>,
) => lazy(factory);
const namedLazy = <T extends React.ComponentType>(
  factory: () => Promise<Record<string, unknown>>,
  name: string,
) =>
  lazy(() =>
    factory().then((m) => ({ default: m[name] as T })),
  );

const ChartOfAccounts = lazyPage(() => import("./pages/ChartOfAccounts"));
const AuthPage = lazyTyped<{ initialMode: "login" | "register" }>(() =>
  import("./pages/AuthPage"),
);
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
const ToolDetailPage = lazyPage(() => import("./pages/ToolDetailPage"));
const ResourceDetailPage = lazyPage(() => import("./pages/ResourceDetailPage"));
const CompanyDetailPage = lazyPage(() => import("./pages/CompanyDetailPage"));
import type { PaymentResultPageProps } from "./pages/PaymentResultPage";
const PaymentResultPage = lazyTyped<PaymentResultPageProps>(() =>
  import("./pages/PaymentResultPage"),
);
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
      staleTime: 2 * 60 * 1000, // 2 menit — cache sebelum dianggap usang
      gcTime: 10 * 60 * 1000, // 10 menit — lama data tetap di memory
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
    "/tools/",
    "/resources/",
    "/company/",
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
    <Suspense fallback={<RouteSuspenseFallback />}>
      <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/solutions/:slug" element={<SolutionDetailPage />} />
      <Route path="/product/:slug" element={<ProductDetailPage />} />
      <Route path="/tools/:slug" element={<ToolDetailPage />} />
      <Route path="/resources/:slug" element={<ResourceDetailPage />} />
      <Route path="/company/:slug" element={<CompanyDetailPage />} />
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

      {/* Protected app routes — shared AppShell layout (Sidebar + Header) */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/journal-entries" element={<JournalEntryPage />} />
        <Route path="/buku-besar" element={<BukuBesarPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help-center" element={<HelpCenterPage />} />
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
            <ProtectedFeature feature="income_statement">
              <IncomeStatementPage />
            </ProtectedFeature>
          }
        />
        <Route
          path="/balance-sheet"
          element={
            <ProtectedFeature feature="balance_sheet">
              <BalanceSheet />
            </ProtectedFeature>
          }
        />
        <Route
          path="/cash-flow"
          element={
            <ProtectedFeature feature="cash_flow">
              <CashFlowPage />
            </ProtectedFeature>
          }
        />
        <Route path="/ai-cfo" element={<AiCfoPage />} />
      </Route>

      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment/success" element={<PaymentResultPage type="success" />} />
      <Route path="/payment/pending" element={<PaymentResultPage type="pending" />} />
      <Route path="/payment/failed" element={<PaymentResultPage type="failed" />} />

      <Route path="/error/:code" element={<ErrorPage />} />
      <Route path="/not-found" element={<NotFoundPage />} />
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
