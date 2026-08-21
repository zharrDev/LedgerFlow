import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, ShieldCheck } from "lucide-react";
import logo from "../assets/ledgerflow.webp";
import { useLanguage } from "../hooks/useLanguage";

const Footer = () => {
  const { language } = useLanguage();
  const id = language === "id";
  const groups = [
    { title: id ? "Solusi" : "Solutions", links: [[id ? "Usaha kecil" : "Small businesses", "/solutions/small-businesses"], [id ? "Perusahaan berkembang" : "Mid-market companies", "/solutions/mid-market-companies"], [id ? "Akuntan & firma" : "Accountants & firms", "/solutions/accountants-firms"]] },
    { title: id ? "Produk" : "Product", links: [[id ? "Chart akun" : "Chart of accounts", "/products/chart-of-accounts"], [id ? "Jurnal" : "Journal entries", "/products/journal-entries"], [id ? "Laporan keuangan" : "Financial reports", "/products/financial-reports"], [id ? "Keamanan" : "Security", "/products/security-compliance"]] },
    { title: id ? "Sumber daya" : "Resources", links: [["Blog", "/resources/blog"], [id ? "Panduan" : "Guides", "/resources/guides-tutorials"], [id ? "Pusat bantuan" : "Help center", "/help"], [id ? "Komunitas" : "Community", "/resources/community"]] },
  ];
  return <footer className="border-t border-gray-800 bg-gray-950 text-gray-300">
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
      <div className="grid gap-10 md:grid-cols-[1.45fr_repeat(3,1fr)]">
        <div><Link to="/" className="inline-flex items-center gap-2"><img src={logo} alt="LedgerFlow" className="h-10 w-10" /><span className="text-xl font-bold text-white">LedgerFlow</span></Link><p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">{id ? "Platform akuntansi modern untuk pembukuan rapi, laporan real-time, dan keputusan bisnis yang lebih percaya diri." : "A modern accounting platform for organized books, real-time reports, and more confident business decisions."}</p><Link to="/help" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300"><Mail size={16}/>{id ? "Hubungi dukungan" : "Contact support"}<ArrowUpRight size={15}/></Link></div>
        {groups.map(group => <div key={group.title}><h4 className="text-sm font-bold text-white">{group.title}</h4><ul className="mt-4 space-y-3">{group.links.map(([label, path]) => <li key={path}><Link to={path} className="text-sm text-gray-400 transition hover:text-cyan-300">{label}</Link></li>)}</ul></div>)}
      </div>
      <div className="mt-12 flex flex-col gap-3 border-t border-gray-800 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 LedgerFlow. {id ? "Seluruh hak cipta dilindungi." : "All rights reserved."}</span><span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-cyan-400" />{id ? "Data terlindungi dengan enkripsi" : "Your data is protected with encryption"}</span></div>
    </div>
  </footer>;
};
export default Footer;
