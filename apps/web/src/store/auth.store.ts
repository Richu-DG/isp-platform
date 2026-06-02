import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant: { id: string; name: string; slug: string };
  mfaEnabled: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password, mfaCode) => {
        const { data } = await api.post("/auth/login", { email, password, mfaCode });
        localStorage.setItem("access_token", data.accessToken);
        localStorage.setItem("refresh_token", data.refreshToken);
        set({ user: data.user, isAuthenticated: true });
      },

      logout: async () => {
        try { await api.post("/auth/logout"); } catch {}
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false });
        window.location.href = "/auth/login";
      },

      refreshUser: async () => {
        const { data } = await api.get("/auth/me");
        set({ user: data.user });
      },
    }),
    { name: "isp-auth", partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
