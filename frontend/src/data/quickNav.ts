import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  FileText,
  TrendingUp,
  Wallet,
  Activity,
  Bot,
  Calendar,
  HelpCircle,
  Settings,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface QuickNavItem {
  label: string;
  link: string;
  keywords: string[];
  icon: LucideIcon;
}

export const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    label: "Dashboard",
    link: "/dashboard",
    keywords: ["dashboard", "ringkasan", "home"],
    icon: LayoutDashboard,
  },
  {
    label: "Chart of Accounts",
    link: "/chart-of-accounts",
    keywords: ["coa", "akun", "chart", "accounts"],
    icon: BookOpen,
  },
  {
    label: "Journal Entries",
    link: "/journal-entries",
    keywords: ["jurnal", "journal", "transaksi", "entry"],
    icon: PlusCircle,
  },
  {
    label: "Buku Besar",
    link: "/buku-besar",
    keywords: ["buku", "besar", "ledger", "mutasi"],
    icon: FileText,
  },
  {
    label: "Laporan Laba Rugi",
    link: "/income-statement",
    keywords: ["laba", "rugi", "income", "pendapatan"],
    icon: TrendingUp,
  },
  {
    label: "Neraca (Balance Sheet)",
    link: "/balance-sheet",
    keywords: ["neraca", "balance", "aset", "liabilitas"],
    icon: Wallet,
  },
  {
    label: "Arus Kas",
    link: "/cash-flow",
    keywords: ["arus", "kas", "cash", "flow"],
    icon: Activity,
  },
  {
    label: "AI CFO Assistant",
    link: "/ai-cfo",
    keywords: ["ai", "cfo", "assistant", "analisis"],
    icon: Bot,
  },
  {
    label: "Manajemen Periode",
    link: "/period-management",
    keywords: ["periode", "period", "buka", "tutup"],
    icon: Calendar,
  },
  {
    label: "Help Center",
    link: "/help-center",
    keywords: ["help", "bantuan", "faq", "support"],
    icon: HelpCircle,
  },
  {
    label: "Settings",
    link: "/settings",
    keywords: ["settings", "pengaturan", "tema"],
    icon: Settings,
  },
  {
    label: "Profile",
    link: "/profile",
    keywords: ["profile", "profil", "akun saya"],
    icon: User,
  },
];

export function filterQuickNav(query: string): QuickNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return QUICK_NAV_ITEMS.slice(0, 6);
  return QUICK_NAV_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}
