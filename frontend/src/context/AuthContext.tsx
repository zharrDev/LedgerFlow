import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabaseClient";

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  company_id?: string;
  company_name?: string;
  avatar_url?: string | null;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  register: (data: {
    name: string;
    email: string;
    password: string;
    company_name: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken) setToken(savedToken);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }

    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  };

  // Update user data (avatar, name, etc.) and sync to localStorage
  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    // JANGAN hapus theme! Hapus token & user saja.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastPath");
    Object.keys(localStorage).forEach(key => { if (key.startsWith("onboarded_")) localStorage.removeItem(key); });

    // Juga logout dari Supabase session
    supabase.auth.signOut();

    setToken(null);
    setUser(null);

    window.location.href = "/login";
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    company_name: string;
  }) => {
    try {
      const response = await api.post("/api/auth/register", data);
      login(response.data.token, response.data.user);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Registration failed");
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        register,
        loginWithGoogle,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
