import { useParams, Link } from "react-router-dom";
import { ShieldAlert, Lock, AlertTriangle, ServerCrash, Home } from "lucide-react";

const errorConfig: Record<string, { icon: typeof ShieldAlert; title: string; desc: string; color: string }> = {
  "401": {
    icon: Lock,
    title: "Belum Login",
    desc: "Silakan login terlebih dahulu untuk mengakses halaman ini.",
    color: "text-orange-500",
  },
  "403": {
    icon: ShieldAlert,
    title: "Akses Ditolak",
    desc: "Anda tidak memiliki izin untuk mengakses halaman ini.",
    color: "text-red-500",
  },
  "404": {
    icon: AlertTriangle,
    title: "Halaman Tidak Ditemukan",
    desc: "Halaman yang Anda cari tidak ada.",
    color: "text-yellow-500",
  },
  "500": {
    icon: ServerCrash,
    title: "Internal Server Error",
    desc: "Terjadi kesalahan pada server. Silakan coba lagi.",
    color: "text-red-600",
  },
};

export default function ErrorPage() {
  const { code = "404" } = useParams();
  const config = errorConfig[code] || errorConfig["404"];
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-darkBg p-4">
      <div className="text-center max-w-md">
        <Icon size={72} className={`${config.color} mx-auto mb-4`} />
        <div className="text-6xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent mb-2">
          {code}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{config.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{config.desc}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition"
          >
            <Home size={18} /> Ke Beranda
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
