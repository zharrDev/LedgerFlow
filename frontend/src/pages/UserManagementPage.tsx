import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserCog, Shield, ShieldCheck, User, Trash2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { api } from "../lib/api";

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
};

const roleIcons: Record<string, typeof Shield> = {
  owner: ShieldCheck,
  admin: Shield,
  akuntan: User,
};

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  akuntan: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users-management");
      setUsers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal memuat data user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.put(`/api/users-management/${userId}/role`, { role: newRole });
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal mengubah role");
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`Hapus user "${userName}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/api/users-management/${userId}`);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal menghapus user");
    }
  };

  return (
    <AppShell title="Manajemen User" description="Kelola role dan akses user dalam perusahaan Anda">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <UserCog size={48} className="mx-auto mb-3 opacity-40" />
          <p>Belum ada user lain di perusahaan ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, idx) => {
            const RoleIcon = roleIcons[user.role] || User;
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-sm flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${roleColors[user.role] || ""}`}>
                    <RoleIcon size={14} />
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>

                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-darkCard text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500/40 outline-none"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="akuntan">Akuntan</option>
                  </select>

                  <button
                    onClick={() => handleDelete(user.id, user.name)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    title="Hapus user"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
