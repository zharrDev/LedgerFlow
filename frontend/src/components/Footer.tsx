import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, ShieldCheck } from "lucide-react";
import { FacebookIcon, InstagramIcon, LinkedinIcon, XIcon, YoutubeIcon } from "./icons/SocialIcons";
import logo from "../assets/ledgerflow.webp";
import { useLanguage } from "../hooks/useLanguage";
import { siteLinks, getLinkHref, type SiteLinkItem } from "../data/siteLinks";

const socials = [
  { name: "Instagram", href: "https://instagram.com/ledgerflow", Icon: InstagramIcon },
  { name: "X (Twitter)", href: "https://x.com/ledgerflow", Icon: XIcon },
  { name: "LinkedIn", href: "https://linkedin.com/company/ledgerflow", Icon: LinkedinIcon },
  { name: "YouTube", href: "https://youtube.com/@ledgerflow", Icon: YoutubeIcon },
  { name: "Facebook", href: "https://facebook.com/ledgerflow", Icon: FacebookIcon },
];

const Footer = () => {
  const { language } = useLanguage();
  const id = language === "id";

  const categoryLabels: Record<string, { en: string; id: string }> = {
    solutions: { en: "Solutions", id: "Solusi" },
    product: { en: "Product", id: "Produk" },
    tools: { en: "Tools", id: "Alat" },
    resources: { en: "Resources", id: "Sumber Daya" },
    company: { en: "Company", id: "Perusahaan" },
  };

  const footerCategories = ["solutions", "product", "tools", "resources", "company"] as const;

  const groups = footerCategories.map((cat) => ({
    title: categoryLabels[cat][language],
    items: siteLinks[cat].map((item: SiteLinkItem) => ({
      label: id
        ? (item.title === "Small Businesses" ? "Usaha kecil"
          : item.title === "Mid-Market Companies" ? "Perusahaan berkembang"
          : item.title === "Accountants & Firms" ? "Akuntan & firma"
          : item.title === "Startups" ? "Startup"
          : item.title === "Chart of Accounts" ? "Chart of accounts"
          : item.title === "Journal Entries" ? "Jurnal"
          : item.title === "Financial Reports" ? "Laporan keuangan"
          : item.title === "How It Works" ? "Cara kerja"
          : item.title === "Integrations" ? "Integrasi"
          : item.title === "Security & Compliance" ? "Keamanan"
          : item.title === "Budget & Forecast" ? "Anggaran & Forecast"
          : item.title === "Multi-Company Management" ? "Multi-perusahaan"
          : item.title === "Automated Bank Sync" ? "Sinkron bank otomatis"
          : item.title === "ROI Calculator" ? "Kalkulator ROI"
          : item.title === "Tax Strategist" ? "Strategi pajak"
          : item.title === "Contact Support" ? "Hubungi dukungan"
          : item.title === "Blog" ? "Blog"
          : item.title === "Guides & Tutorials" ? "Panduan"
          : item.title === "Help Center" ? "Pusat bantuan"
          : item.title === "Community" ? "Komunitas"
          : item.title === "Templates" ? "Template"
          : item.title === "About Us" ? "Tentang kami"
          : item.title === "Contact" ? "Kontak"
          : item.title)
        : item.title,
      href: getLinkHref(item, cat),
      comingSoon: item.comingSoon,
    })),
  }));

  return (
    <footer className="border-t border-gray-800 bg-gray-950 text-gray-300">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 grid-cols-2 md:grid-cols-[1.45fr_repeat(5,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src={logo} alt="LedgerFlow" loading="lazy" decoding="async" className="h-10 w-10" />
              <span className="text-xl font-bold text-white">LedgerFlow</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
              {id
                ? "Platform akuntansi modern untuk pembukuan rapi, laporan real-time, dan keputusan bisnis yang lebih percaya diri."
                : "A modern accounting platform for organized books, real-time reports, and more confident business decisions."}
            </p>
            <Link to="/help" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300">
              <Mail size={16} />{id ? "Hubungi dukungan" : "Contact support"}<ArrowUpRight size={15} />
            </Link>
            <div className="mt-6 flex items-center gap-2.5">
              {socials.map(({ name, href, Icon }) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-800 bg-gray-900 text-gray-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300 hover:shadow-[0_4px_14px_-4px_rgba(34,211,238,0.45)]">
                  <Icon size={16} className="transition-transform duration-200 group-hover:scale-110" />
                </a>
              ))}
            </div>
          </div>
          {groups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-bold text-white">{group.title}</h4>
              <ul className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    {item.comingSoon ? (
                      <span className="text-sm text-gray-600 dark:text-gray-600 cursor-not-allowed inline-flex items-center gap-1.5">
                        {item.label}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">Soon</span>
                      </span>
                    ) : (
                      <Link to={item.href} className="text-sm text-gray-400 transition hover:text-cyan-300">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-gray-800 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 LedgerFlow. {id ? "Seluruh hak cipta dilindungi." : "All rights reserved."}</span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={15} className="text-cyan-400" />{id ? "Data terlindungi dengan enkripsi" : "Your data is protected with encryption"}
          </span>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
