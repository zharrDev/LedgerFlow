// ─────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH — seluruh navigasi aplikasi
// Dipakai oleh: Sidebar (desktop), MobileDrawer, BottomNav + BottomNavSheet,
// dan Quick Navigation (search). Tambah menu baru cukup di sini.
// ─────────────────────────────────────────────────────────────────────
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  FileText,
  TrendingUp,
  Wallet,
  Activity,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  User,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavSection = "menu" | "account" | "search";

export type BilingualLabel = { en: string; id: string };

export interface NavChild {
  label: BilingualLabel;
  path: string;
  icon: LucideIcon;
  keywords: string[];
  /** Urutan tampil saat di-flatten untuk Sidebar desktop (identik dengan tata letak lama). */
  desktopOrder: number;
}

export interface NavItem {
  id: string;
  label: BilingualLabel;
  path: string;
  icon: LucideIcon;
  section: NavSection;
  /** Urutan tampil di Sidebar desktop (urutan lama dipertahankan persis). */
  desktopOrder: number;
  /** Hanya untuk pencarian (bukan menu sidebar/bottom/drawer). */
  searchOnly?: boolean;
  /** Batasi akses role; kosong = semua role. */
  roles?: string[];
  keywords: string[];
  children?: NavChild[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: { en: "Dashboard", id: "Dashboard" },
    path: "/dashboard",
    icon: LayoutDashboard,
    section: "menu",
    desktopOrder: 1,
    keywords: ["dashboard", "ringkasan", "home"],
  },
  {
    id: "accounts",
    label: { en: "Accounts", id: "Akun" },
    path: "/chart-of-accounts",
    icon: BookOpen,
    section: "menu",
    desktopOrder: 2,
    keywords: ["accounts", "akun", "chart of accounts", "buku besar", "ledger"],
    children: [
      {
        label: { en: "Chart of Accounts", id: "Buku Besar Akun" },
        path: "/chart-of-accounts",
        icon: BookOpen,
        keywords: ["coa", "akun", "chart", "accounts"],
        desktopOrder: 2,
      },
      {
        label: { en: "General Ledger", id: "Buku Besar" },
        path: "/buku-besar",
        icon: FileText,
        keywords: ["buku", "besar", "ledger", "mutasi"],
        desktopOrder: 4,
      },
    ],
  },
  {
    id: "journal",
    label: { en: "Journal Entries", id: "Jurnal" },
    path: "/journal-entries",
    icon: PlusCircle,
    section: "menu",
    desktopOrder: 3,
    keywords: ["jurnal", "journal", "transaksi", "entry"],
  },
  {
    id: "reports",
    label: { en: "Reports", id: "Laporan" },
    path: "/income-statement",
    icon: FileText,
    section: "menu",
    desktopOrder: 5,
    keywords: ["laporan", "reports", "laba", "rugi", "neraca", "kas"],
    children: [
      {
        label: { en: "Income Statement", id: "Laba Rugi" },
        path: "/income-statement",
        icon: TrendingUp,
        keywords: ["laba", "rugi", "income", "pendapatan"],
        desktopOrder: 5,
      },
      {
        label: { en: "Balance Sheet", id: "Neraca" },
        path: "/balance-sheet",
        icon: Wallet,
        keywords: ["neraca", "balance", "aset", "liabilitas"],
        desktopOrder: 6,
      },
      {
        label: { en: "Cash Flow", id: "Arus Kas" },
        path: "/cash-flow",
        icon: Activity,
        keywords: ["arus", "kas", "cash", "flow"],
        desktopOrder: 7,
      },
    ],
  },
  {
    id: "period-management",
    label: { en: "Period Management", id: "Manajemen Periode" },
    path: "/period-management",
    icon: Calendar,
    section: "menu",
    desktopOrder: 8,
    roles: ["owner"],
    keywords: ["periode", "period", "buka", "tutup"],
  },
  {
    id: "users-management",
    label: { en: "User Management", id: "Manajemen Pengguna" },
    path: "/users-management",
    icon: Users,
    section: "menu",
    desktopOrder: 9,
    roles: ["owner"],
    keywords: ["user", "users", "management", "member", "role"],
  },
  {
    id: "help-center",
    label: { en: "Help & Support", id: "Bantuan & Dukungan" },
    path: "/help-center",
    icon: HelpCircle,
    section: "account",
    desktopOrder: 10,
    keywords: ["help", "bantuan", "faq", "support"],
  },
  {
    id: "ai-cfo",
    label: { en: "AI CFO Assistant", id: "Asisten AI CFO" },
    path: "/ai-cfo",
    icon: Bot,
    section: "search",
    searchOnly: true,
    desktopOrder: 99,
    keywords: ["ai", "cfo", "assistant", "analisis"],
  },
  // Profile & Settings tidak ada di sidebar — ada di dropdown avatar Header.
  // Tetap diikutsertakan di search-only supaya muncul di pencarian cepat.
  {
    id: "profile",
    label: { en: "Profile", id: "Profil" },
    path: "/profile",
    icon: User,
    section: "search",
    searchOnly: true,
    desktopOrder: 100,
    keywords: ["profile", "profil", "akun saya"],
  },
  {
    id: "settings",
    label: { en: "Settings", id: "Pengaturan" },
    path: "/settings",
    icon: Settings,
    section: "search",
    searchOnly: true,
    desktopOrder: 101,
    keywords: ["settings", "pengaturan", "tema"],
  },
];

/** Tab Bottom Navigation — urutan array = urutan tampil. */
export const BOTTOM_NAV_IDS = [
  "dashboard",
  "journal",
  "accounts",
  "reports",
  "profile",
] as const;

export interface FlatNavItem {
  id: string;
  label: BilingualLabel;
  path: string;
  icon: LucideIcon;
  section: NavSection;
  desktopOrder: number;
  roles?: string[];
  keywords: string[];
  /** Parent group (jika item ini child), dipakai untuk mendeteksi tab aktif. */
  groupId?: string;
}

/** Flatten group -> leaf item, urut sesuai desktopOrder (tampilan desktop lama). */
export function flattenNavItems(): FlatNavItem[] {
  const flat: FlatNavItem[] = [];
  for (const item of NAV_ITEMS) {
    if (item.searchOnly || item.section === "search") continue;
    if (item.children?.length) {
      for (const child of item.children) {
        flat.push({
          id: child.path,
          label: child.label,
          path: child.path,
          icon: child.icon,
          section: item.section,
          desktopOrder: child.desktopOrder,
          roles: item.roles,
          keywords: child.keywords,
          groupId: item.id,
        });
      }
    } else {
      flat.push({
        id: item.id,
        label: item.label,
        path: item.path,
        icon: item.icon,
        section: item.section,
        desktopOrder: item.desktopOrder,
        roles: item.roles,
        keywords: item.keywords,
      });
    }
  }
  return flat.sort((a, b) => a.desktopOrder - b.desktopOrder);
}

/** Path yang sudah dicakup Bottom Navigation (termasuk semua child). */
export function getBottomNavPaths(): Set<string> {
  const paths = new Set<string>();
  for (const id of BOTTOM_NAV_IDS) {
    const item = NAV_ITEMS.find((n) => n.id === id);
    if (!item) continue;
    paths.add(item.path);
    item.children?.forEach((c) => paths.add(c.path));
  }
  return paths;
}

function canAccessItem(item: { roles?: string[] }, role?: string): boolean {
  if (!item.roles?.length) return true;
  return !!role && item.roles.includes(role);
}

/** Menu utama Sidebar desktop (flatten, urut desktopOrder). */
export function getDesktopSidebarMenuItems(role?: string): FlatNavItem[] {
  return flattenNavItems().filter(
    (item) => item.section === "menu" && canAccessItem(item, role),
  );
}

/** Link akun di bawah Sidebar desktop (Profile, Settings, Help). */
export function getDesktopSidebarAccountItems(role?: string): FlatNavItem[] {
  return flattenNavItems().filter(
    (item) => item.section === "account" && canAccessItem(item, role),
  );
}

/**
 * Item drawer mobile (hamburger) — hanya yang TIDAK ada di Bottom Navigation,
 * supaya tidak duplikat dengan tab bawah.
 */
export function getMobileDrawerItems(role?: string): FlatNavItem[] {
  const bottomPaths = getBottomNavPaths();
  const bottomGroupIds = new Set<string>(BOTTOM_NAV_IDS);

  return flattenNavItems().filter((item) => {
    if (!canAccessItem(item, role)) return false;
    if (bottomPaths.has(item.path)) return false;
    if (item.groupId && bottomGroupIds.has(item.groupId)) return false;
    return true;
  });
}

/** Tab Bottom Navigation (urut) + filter role. */
export function getBottomNavItems(role?: string): NavItem[] {
  return BOTTOM_NAV_IDS.map(
    (id) => NAV_ITEMS.find((item) => item.id === id)!,
  ).filter(
    (item) => !item.roles || (!!role && item.roles.includes(role)),
  );
}

/** True bila pathname adalah halaman item itu sendiri atau salah satu child-nya. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.path === pathname) return true;
  return !!item.children?.some((child) => child.path === pathname);
}

// ─── Quick Navigation (untuk pencarian Header) ────────────────────────
export interface QuickNavItem {
  label: BilingualLabel;
  link: string;
  keywords: string[];
  icon: LucideIcon;
}

export function filterQuickNav(query: string, lang: "en" | "id" = "en"): QuickNavItem[] {
  const all: QuickNavItem[] = NAV_ITEMS.flatMap((item) => {
    if (item.children?.length) {
      return item.children.map((child) => ({
        label: child.label,
        link: child.path,
        keywords: child.keywords,
        icon: child.icon,
      }));
    }
    return [
      {
        label: item.label,
        link: item.path,
        keywords: item.keywords,
        icon: item.icon,
      },
    ];
  });

  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, 6);
  return all.filter(
    (item) =>
      item.label[lang].toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}