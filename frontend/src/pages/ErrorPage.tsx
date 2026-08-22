import { useParams, Link } from "react-router-dom";
import { ShieldAlert, Lock, AlertTriangle, ServerCrash, Home } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

type ErrorEntry = { icon: typeof ShieldAlert; color: string; title: { en: string; id: string }; desc: { en: string; id: string } };

const errorConfig: Record<string, ErrorEntry> = {
  "401": {
    icon: Lock,
    color: "text-orange-500",
    title: { en: "Not Signed In", id: "Belum Login" },
    desc: {
      en: "Please sign in first to access this page.",
      id: "Silakan login terlebih dahulu untuk mengakses halaman ini.",
    },
  },
  "403": {
    icon: ShieldAlert,
    color: "text-red-500",
    title: { en: "Access Denied", id: "Akses Ditolak" },
    desc: {
      en: "You do not have permission to access this page.",
      id: "Anda tidak memiliki izin untuk mengakses halaman ini.",
    },
  },
  "404": {
    icon: AlertTriangle,
    color: "text-yellow-500",
    title: { en: "Page Not Found", id: "Halaman Tidak Ditemukan" },
    desc: {
      en: "The page you are looking for does not exist.",
      id: "Halaman yang Anda cari tidak ada.",
    },
  },
  "500": {
    icon: ServerCrash,
    color: "text-red-600",
    title: { en: "Internal Server Error", id: "Kesalahan Server Internal" },
    desc: {
      en: "Something went wrong on our server. Please try again.",
      id: "Terjadi kesalahan pada server. Silakan coba lagi.",
    },
  },
};

export default function ErrorPage() {
  const { code = "404" } = useParams();
  const { language } = useLanguage();
  const config = errorConfig[code] || errorConfig["404"];
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-darkBg p-4">
      <div className="text-center max-w-md">
        <Icon size={72} className={`${config.color} mx-auto mb-4`} />
        <div className="text-6xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent mb-2">
          {code}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{config.title[language]}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{config.desc[language]}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition"
          >
            <Home size={18} /> {language === "id" ? "Ke Beranda" : "Go Home"}
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {language === "id" ? "Masuk" : "Sign in"}
          </Link>
        </div>
      </div>
    </div>
  );
}
