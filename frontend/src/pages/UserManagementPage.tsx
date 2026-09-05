import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCog,
  Shield,
  ShieldCheck,
  User,
  Trash2,
  Plus,
  Lock,
  X,
  Ban,
  RotateCcw,
  Phone,
} from "lucide-react";
import { useSetAppShellConfig } from "../context/AppShellConfigContext";
import { ScrollReveal } from "../components/ScrollReveal";
import { HoverDropdown } from "../components/HoverDropdown";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorMessage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

type MemberStatus = "active" | "suspended";

type UserData = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: MemberStatus;
  avatar_url: string | null;
  created_at: string;
};

const roleIcons: Record<string, typeof Shield> = {
  owner: ShieldCheck,
  akuntan: User,
};

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  akuntan: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const statusColors: Record<MemberStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  suspended:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function UserManagementPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const setAppShellConfig = useSetAppShellConfig();
  const myRole = me?.role || "owner";

  // Set AppShell title/description
  useEffect(() => {
    setAppShellConfig({
      title: tx(language, "User Management", "Manajemen User"),
      description: tx(language, "Manage user roles and access in your company", "Kelola role dan akses user dalam perusahaan Anda"),
    });
    return () => setAppShellConfig({});
  }, [setAppShellConfig, language]);

  const ALL_ROLES = [
    { value: "owner", label: tx(language, "Owner", "Pemilik") },
    { value: "akuntan", label: tx(language, "Accountant", "Akuntan") },
  ];

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", role: "akuntan" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Halaman ini hanya bisa diakses owner (RoleRoute), jadi semua baris editable.
  // Owner boleh mengubah role antara owner <-> akuntan.
  const roleOptions = ALL_ROLES;
  const canManageRole = () => true;

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users-management");
      setUsers(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.put(`/api/users-management/${userId}/role`, { role: newRole });
      await fetchUsers();
      toast({
        variant: "success",
        title: tx(language, "Role updated successfully", "Role berhasil diubah"),
        message: tx(language, `Role updated to ${newRole}.`, `Role diperbarui menjadi ${newRole}.`),
      });
    } catch (err: any) {
      toast({
        variant: "error",
        title: tx(language, "Failed to change role", "Gagal mengubah role"),
        message: getErrorMessage(err),
      });
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (
      !window.confirm(tx(language, `Remove user "${userName}" from this company? Their account stays intact — including access to other companies.`, `Hapus user "${userName}" dari perusahaan ini? Akunnya tetap utuh — termasuk akses ke perusahaan lain.`))
    )
      return;
    try {
      await api.delete(`/api/users-management/${userId}`);
      await fetchUsers();
      toast({
        variant: "success",
        title: tx(language, "User removed", "User dihapus"),
        message: tx(language, `${userName} has been removed from the company.`, `${userName} berhasil dihapus dari perusahaan.`),
      });
    } catch (err: any) {
      toast({
        variant: "error",
        title: tx(language, "Failed to remove user", "Gagal menghapus user"),
        message: getErrorMessage(err),
      });
    }
  };

  const handleSuspend = async (userId: string, userName: string) => {
    try {
      await api.patch(`/api/users-management/${userId}/suspend`);
      await fetchUsers();
      toast({
        variant: "success",
        title: tx(language, "User suspended", "User dinonaktifkan"),
        message: tx(language, `${userName} has been deactivated in this company. Their session is revoked immediately.`, `${userName} dinonaktifkan di perusahaan ini. Sesi-nya langsung dicabut.`),
      });
    } catch (err: any) {
      toast({
        variant: "error",
        title: tx(language, "Failed to suspend user", "Gagal menonaktifkan user"),
        message: getErrorMessage(err),
      });
    }
  };

  const handleReactivate = async (userId: string, userName: string) => {
    try {
      await api.patch(`/api/users-management/${userId}/reactivate`);
      await fetchUsers();
      toast({
        variant: "success",
        title: tx(language, "User reactivated", "User diaktifkan kembali"),
        message: tx(language, `${userName} is active again in this company.`, `${userName} kembali aktif di perusahaan ini.`),
      });
    } catch (err: any) {
      toast({
        variant: "error",
        title: tx(language, "Failed to reactivate user", "Gagal mengaktifkan user"),
        message: getErrorMessage(err),
      });
    }
  };

  const handleAddMember = async () => {
    setFormError("");
    const digits = form.phone.replace(/[\s\-().+]/g, "");
    if (!form.name.trim() || !digits) {
      setFormError(tx(language, "Name and WhatsApp number are required.", "Nama dan nomor WhatsApp wajib diisi."));
      return;
    }
    if (!/^\d{8,15}$/.test(digits)) {
      setFormError(tx(language, "Enter a valid WhatsApp number, e.g. 081234567890.", "Masukkan nomor WhatsApp yang valid, cth. 081234567890."));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/users-management", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
      });
      setShowModal(false);
      setForm({ name: "", phone: "", role: "akuntan" });
      await fetchUsers();
    } catch (err: any) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ── Tombol Tambah Anggota ── */}
      <ScrollReveal direction="left" className="flex justify-end mb-4">
        <button
          onClick={() => {
            setFormError("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:opacity-95 transition-all"
        >
          <Plus size={16} />
          {tx(language, "Add Member", "Tambah Anggota")}
        </button>
      </ScrollReveal>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
          {error}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <UserCog size={48} className="mx-auto mb-3 opacity-40" />
          <p>{tx(language, "No other users in this company yet.", "Belum ada user lain di perusahaan ini.")}</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus size={16} />
            {tx(language, "Add First Member", "Tambah Anggota Pertama")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, idx) => {
            const RoleIcon = roleIcons[user.role] || User;
            const editable = canManageRole();
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative z-0 hover:z-20 bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm overflow-visible"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-sm flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold text-gray-900 dark:text-white truncate ${user.status === "suspended" ? "opacity-60" : ""}`}>
                      {user.name}
                      {user.role === "owner" && myRole !== "owner" && (
                        <Lock size={12} className="inline ml-1.5 text-gray-400 -mt-0.5" />
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                      <Phone size={11} className="shrink-0" />
                      {user.phone || user.email || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${roleColors[user.role] || ""}`}
                  >
                    <RoleIcon size={14} />
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[user.status] || statusColors.active}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${user.status === "suspended" ? "bg-amber-500" : "bg-emerald-500"}`} />
                    {user.status === "suspended"
                      ? tx(language, "Suspended", "Suspend")
                      : tx(language, "Active", "Aktif")}
                  </span>

                  {editable ? (
                    <HoverDropdown
                      value={user.role}
                      onChange={(v) => handleRoleChange(user.id, v)}
                      options={roleOptions}
                      minWidth={140}
                      placeholder={tx(language, "Select role", "Pilih role")}
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 cursor-not-allowed select-none">
                      <Lock size={12} />
                      {tx(language, "Owner", "Pemilik")}
                    </span>
                  )}

                  {editable && user.id !== me?.id && (
                    user.status === "suspended" ? (
                      <button
                        onClick={() => handleReactivate(user.id, user.name)}
                        className="p-2 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                        title={tx(language, "Reactivate", "Aktifkan kembali")}
                      >
                        <RotateCcw size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspend(user.id, user.name)}
                        className="p-2 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                        title={tx(language, "Suspend", "Nonaktifkan sementara")}
                      >
                        <Ban size={16} />
                      </button>
                    )
                  )}

                  {editable && (
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      title={tx(language, "Remove from company", "Hapus dari perusahaan")}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Modal Tambah Anggota ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {tx(language, "Add Member", "Tambah Anggota")}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    {tx(language, "Full Name", "Nama Lengkap")}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={tx(language, "e.g. Budi Santoso", "cth: Budi Santoso")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    {tx(language, "WhatsApp Number", "Nomor WhatsApp")}
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={tx(language, "e.g. 081234567890", "cth: 081234567890")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 outline-none transition"
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                    {tx(
                      language,
                      "Already registered on another company? They'll be added to this one too — no new account needed.",
                      "Sudah terdaftar di perusahaan lain? Nomor ini langsung ditambahkan ke perusahaan ini — tanpa buat akun baru.",
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    Role
                  </label>
                  <HoverDropdown
                    value={form.role}
                    onChange={(v) => setForm({ ...form, role: v })}
                    options={roleOptions.filter((r) => r.value !== "owner")}
                    minWidth={140}
                    fullWidth
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                    {tx(language, "The invited member receives a WhatsApp invitation and logs in with an OTP code.", "Anggota yang diundang menerima notifikasi WhatsApp dan login dengan kode OTP.")}
                  </p>
                </div>

                {formError && (
                  <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <button
                  onClick={handleAddMember}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold shadow-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? tx(language, "Saving...", "Menyimpan...") : tx(language, "Send Invitation", "Kirim Undangan")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}