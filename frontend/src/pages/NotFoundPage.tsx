import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../hooks/useLanguage";

export default function NotFoundPage() {
  const { language } = useLanguage();
  const id = language === "id";

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-darkBg">
      <Navbar />
      <div className="relative flex-1 flex items-center justify-center p-4 pt-24 overflow-hidden">
        {/* Glow latar — mask radial supaya memudar sebelum tepi (tanpa garis) */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/10 blur-3xl"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 72%)",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 72%)",
          }}
        />
        <div className="relative text-center max-w-md">
          <div className="text-8xl font-bold bg-gradient-to-r from-primary-600 to-cyan-500 bg-clip-text text-transparent mb-4 tracking-tight">404</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{id ? "Halaman Tidak Ditemukan" : "Page Not Found"}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">{id ? "Halaman yang Anda cari tidak ada atau telah dipindahkan." : "The page you are looking for does not exist or has been moved."}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-md shadow-primary-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"><Home size={18} /> {id ? "Ke Beranda" : "Go Home"}</Link>
            <button onClick={() => window.history.back()} className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"><ArrowLeft size={18} /> {id ? "Kembali" : "Go Back"}</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
