// frontend/src/data/siteLinks.ts
// Single source of truth for ALL navigation links — used by Navbar (header dropdown) AND Footer.

import {
  Building,
  Landmark,
  Users,
  Receipt,
  BookOpen,
  FileText,
  TrendingUp,
  PlayCircle,
  Layers,
  Shield,
  Calculator,
  Newspaper,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";

export type SiteLinkItem = {
  slug?: string;
  icon?: LucideIcon;
  title: string;
  tagline?: string;
  /** If set, href becomes this anchor instead of /<category>/<slug> */
  anchor?: string;
  /** Direct href override (e.g. "/help") — skips slug-based routing */
  href?: string;
  /** If true, item is non-clickable with "Soon" badge */
  comingSoon?: boolean;
};

export type SiteLinkCategory = SiteLinkItem[];

export const siteLinks = {
  solutions: [
    { slug: "small-business", icon: Building, title: "Small Businesses", tagline: "Simplified bookkeeping & tax prep" },
    { slug: "mid-market", icon: Landmark, title: "Mid-Market Companies", tagline: "Multi-entity & advanced reporting" },
    { slug: "accountants-firms", icon: Users, title: "Accountants & Firms", tagline: "Manage multiple clients in one place" },
    { slug: "startups", icon: Receipt, title: "Startups", tagline: "From day-one to Series A" },
  ] satisfies SiteLinkCategory,

  product: [
    { slug: "chart-of-accounts", icon: BookOpen, title: "Chart of Accounts", tagline: "Customizable account structure" },
    { slug: "journal-entries", icon: FileText, title: "Journal Entries", tagline: "Double-entry with auto-balance" },
    { slug: "financial-reports", icon: TrendingUp, title: "Financial Reports", tagline: "Income, Balance Sheet, Cash Flow" },
    { slug: "how-it-works", icon: PlayCircle, title: "How It Works", tagline: "See the platform in action", anchor: "/#demo" },
    { slug: "integrations", icon: Layers, title: "Integrations", tagline: "Connect banks, ERPs, & more", anchor: "/#features" },
    { slug: "security", icon: Shield, title: "Security & Compliance", tagline: "SOC 2, GDPR, 256-bit encryption", anchor: "/#security" },
  ] satisfies SiteLinkCategory,

  tools: [
    { slug: "roi-calculator", icon: Calculator, title: "ROI Calculator", comingSoon: true },
    { slug: "tax-strategist", icon: Receipt, title: "Tax Strategist", comingSoon: true },
    { title: "Contact Support", icon: HelpCircle, href: "/help" },
  ] satisfies SiteLinkCategory,

  resources: [
    { slug: "blog", icon: Newspaper, title: "Blog", comingSoon: true },
    { slug: "guides", icon: GraduationCap, title: "Guides & Tutorials", comingSoon: true },
    { title: "Help Center", icon: HelpCircle, href: "/help" },
    { slug: "community", icon: MessageSquare, title: "Community", comingSoon: true },
    { slug: "templates", icon: FileSpreadsheet, title: "Templates", comingSoon: true },
  ] satisfies SiteLinkCategory,

  company: [
    { slug: "about", icon: Building, title: "About Us", comingSoon: true },
    { title: "Contact", icon: HelpCircle, href: "/help" },
  ] satisfies SiteLinkCategory,
} as const;

/**
 * Resolve the href for a site link item.
 * Priority: direct href > anchor > /<category>/<slug>
 */
export function getLinkHref(
  item: SiteLinkItem,
  category: keyof typeof siteLinks,
): string {
  if (item.href) return item.href;
  if (item.anchor) return item.anchor;
  return `/${category}/${item.slug}`;
}
