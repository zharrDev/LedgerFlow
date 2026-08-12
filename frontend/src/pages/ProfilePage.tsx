import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { AppShell } from "../components/AppShell";
import {
  User,
  Mail,
  Camera,
  Save,
  Building2,
  Shield,
  Calendar,
  CheckCircle2,
  Loader2,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { pushNotification } from "../components/Header";
import { validateName } from "../utils/validation";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};
const letterContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.3 },
  },
};
const letterVariants = {
  hidden: { y: 40, opacity: 0, rotateX: -90 },
  visible: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

export default function ProfilePage() {
  const { user, login, token, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
    });
  }, [user]);

  // Auto-hide message
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const avatarUrl = user?.avatar_url || null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Ukuran foto maksimal 2MB" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "File harus berupa gambar" });
      return;
    }

    setUploadingAvatar(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(base64, 200, 200, 0.8);

      // Upload ke Supabase Storage via endpoint avatar, simpan URL-nya
      try {
        const { data } = await api.post("/api/upload/avatar", {
          dataUrl: compressed,
        });
        const uploadedUrl = data?.url ?? compressed;

        // Update AuthContext + localStorage
        updateUser({ avatar_url: uploadedUrl });

        // Push notification
        pushNotification({
          type: "profile_updated",
          title: "Foto Profil Diperbarui",
          message: "Avatar baru Anda sudah aktif di seluruh aplikasi.",
          link: "/profile",
        });

        setMessage({
          type: "success",
          text: "Foto profil berhasil diperbarui!",
        });
      } catch (err: any) {
        console.error(
          "[Profile] avatar save failed:",
          err.response?.data?.error || err.message,
        );
        setMessage({
          type: "error",
          text: err.response?.data?.error || "Gagal mengupload foto profil",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: "Gagal mengupload foto profil",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const nameError = validateName(form.name);

  const handleSave = async () => {
    if (nameError) {
      setNameTouched(true);
      setMessage({ type: "error", text: nameError });
      return;
    }

    setSaving(true);

    try {
      const { data } = await api.put(`/api/users/${user?.id}`, {
        name: form.name,
      });

      // Preserve avatar_url dari current user (jangan overwrite)
      const updatedUser = {
        ...user,
        name: form.name,
        avatar_url: data?.avatar_url ?? user?.avatar_url,
      };
      if (token) {
        login(token, updatedUser);
      }

      setMessage({ type: "success", text: "Profil berhasil diperbarui!" });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Gagal menyimpan profil",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
              <User size={20} />
            </div>
            <motion.h1
              variants={letterContainerVariants}
              initial="hidden"
              animate="visible"
              className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
              style={{ perspective: "600px" }}
            >
              {"Profile".split("").map((char, i) => (
                <motion.span
                  key={i}
                  variants={letterVariants}
                  className="inline-block"
                  style={{ transformOrigin: "bottom center" }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </motion.h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Kelola informasi dan foto profil Anda
          </p>
        </motion.div>

        {/* Avatar Card */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden ring-4 ring-primary-500/20">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(user?.name || "User")
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-not-allowed"
              >
                {uploadingAvatar ? (
                  <Loader2 size={24} className="text-white animate-spin" />
                ) : (
                  <Camera size={24} className="text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user?.name || "User"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email || "user@ledgerflow.com"}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 capitalize">
                  <Shield size={12} /> {user?.role || "owner"}
                </span>
                <span className="text-xs text-gray-400">
                  Bergabung {user?.id ? "Jun 2026" : "—"}
                </span>
              </div>
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="mt-3 text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
              >
                {uploadingAvatar ? "Mengupload..." : "Ubah foto profil"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
            Informasi Pribadi
          </h3>

          {/* Message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                  : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {message.text}
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onBlur={() => setNameTouched(true)}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border ${nameTouched && nameError ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-darkBg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition`}
                />
              </div>
              {nameTouched && nameError && (
                <p className="text-xs text-red-500 mt-1">{nameError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Email tidak dapat diubah
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 w-full sm:w-auto"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin flex-shrink-0" />
                ) : (
                  <Save size={16} className="flex-shrink-0" />
                )}
                <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
            Informasi Akun
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Building2 size={14} /> Perusahaan
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {user?.company_name || "My Company"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Shield size={14} /> Role
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">
                {user?.role || "owner"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Calendar size={14} /> Bergabung
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Juni 2026
              </span>
            </div>
          </div>
        </motion.div>

        {/* Akses cepat akun (mobile: dari tab Profile) */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-6 pt-6 pb-2">
            Akun & Bantuan
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <Link
              to="/settings"
              className="flex items-center gap-3 px-6 py-3.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <Settings size={18} className="text-gray-400 shrink-0" />
              <span className="flex-1 font-medium">Settings</span>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>
            <Link
              to="/help-center"
              className="flex items-center gap-3 px-6 py-3.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <HelpCircle size={18} className="text-gray-400 shrink-0" />
              <span className="flex-1 font-medium">Help & Support</span>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="w-full flex items-center gap-3 px-6 py-3.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <LogOut size={18} className="shrink-0" />
              <span className="flex-1 font-medium text-left">Logout</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}

// ─── Image Compression Utility ────────────────────────────────────────
function compressImage(
  base64: string,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.onerror = reject;
    img.src = base64;
  });
}
