"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;     
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void; 
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = false;

function clearLegacyAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = "belgodata_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "belgodata_user=; path=/; max-age=0; SameSite=Lax";
}

function setAuthTokenCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `belgodata_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
  } else {
    document.cookie = "belgodata_token=; path=/; max-age=0; SameSite=Lax";
  }
}

function isTokenSafe(token: string | null): boolean {
  return typeof token === "string" && token.length < 4096;
}

function isSavedUserSafe(rawUser: string | null): boolean {
  return typeof rawUser === "string" && rawUser.length < 12000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearLegacyAuthCookies();

    const savedToken = localStorage.getItem("belgodata_token");
    const savedUser = localStorage.getItem("belgodata_user");

    if (isTokenSafe(savedToken)) {
      setToken(savedToken);
      axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
      setAuthTokenCookie(savedToken);
    } else {
      localStorage.removeItem("belgodata_token");
      localStorage.removeItem("belgodata_user");
    }

    if (savedUser && isSavedUserSafe(savedUser)) {
      try {
        setUser(JSON.parse(savedUser) as User);
      } catch (error) {
        console.error("Impossible de parser l'utilisateur stocké", error);
        localStorage.removeItem("belgodata_user");
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      axios.get("/api/auth/me")
        .then((res) => {
          const backendUser = res.data;
          const normalizedUser: User = getSafeUser({
            id: backendUser._id || backendUser.id,
            name: backendUser.name,
            email: backendUser.email,
            role: backendUser.role,
            phone: backendUser.phone,
          });
          setUser(normalizedUser);
          if (isSavedUserSafe(JSON.stringify(normalizedUser))) {
            localStorage.setItem("belgodata_user", JSON.stringify(normalizedUser));
          }
        })
        .catch((error) => {
          console.error("Impossible de charger l'utilisateur depuis l'API", error);
        });
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  function getSafeUser(user: Partial<User>) {
    return {
      id: user.id || "",
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      phone: user.phone || "",
    } as User;
  }

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token: t, user: u } = res.data;
      const safeUser = getSafeUser(u);
      setToken(t);
      setUser(safeUser);
      if (isTokenSafe(t)) {
        localStorage.setItem("belgodata_token", t);
        setAuthTokenCookie(t);
      }
      if (isSavedUserSafe(JSON.stringify(safeUser))) {
        localStorage.setItem("belgodata_user", JSON.stringify(safeUser));
      }
      axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    } finally {
      setLoading(false);
    }
  }

  async function signup(name: string, email: string, phone: string, password: string) {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/signup`, { name, email, phone, password });
      const { token: t, user: u } = res.data;
      const safeUser = getSafeUser(u);
      setToken(t);
      setUser(safeUser);
      if (isTokenSafe(t)) {
        localStorage.setItem("belgodata_token", t);
        setAuthTokenCookie(t);
      }
      if (isSavedUserSafe(JSON.stringify(safeUser))) {
        localStorage.setItem("belgodata_user", JSON.stringify(safeUser));
      }
      axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    clearLegacyAuthCookies();
    localStorage.removeItem("belgodata_token");
    localStorage.removeItem("belgodata_user");
    delete axios.defaults.headers.common["Authorization"];
  }
  function updateUser(updatedUser: Partial<User>) {
  const newUser = { ...user, ...updatedUser } as User;
  setUser(newUser);
  localStorage.setItem("belgodata_user", JSON.stringify(newUser));
}

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}