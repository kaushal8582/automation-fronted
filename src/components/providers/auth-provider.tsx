"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMe,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  type PublicUser,
} from "@/lib/auth-api";

type AuthContextValue = {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    timezone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { user: me } = await fetchMe();
      setUser(me);
    } catch {
      try {
        await refreshSession();
        const { user: me } = await fetchMe();
        setUser(me);
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: next } = await loginUser({ email, password });
    setUser(next);
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; timezone?: string }) => {
      const { user: next } = await registerUser(input);
      setUser(next);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
