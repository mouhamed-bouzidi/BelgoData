"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function setAuthCookie(tokenValue: string | null) {
  if (typeof document === "undefined") return;

  if (tokenValue) {
    document.cookie = `belgodata_token=${tokenValue}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
  } else {
    document.cookie = "belgodata_token=; path=/; max-age=0";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("belgodata_token");
  });
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const savedUser = localStorage.getItem("belgodata_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [token]);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token: t, user: u } = res.data;
      setToken(t);
      setUser(u);
      setAuthCookie(t);
      localStorage.setItem("belgodata_token", t);
      localStorage.setItem("belgodata_user", JSON.stringify(u));
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
      setToken(t);
      setUser(u);
      setAuthCookie(t);
      localStorage.setItem("belgodata_token", t);
      localStorage.setItem("belgodata_user", JSON.stringify(u));
      axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setAuthCookie(null);
    localStorage.removeItem("belgodata_token");
    localStorage.removeItem("belgodata_user");
    delete axios.defaults.headers.common["Authorization"];
  }

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}