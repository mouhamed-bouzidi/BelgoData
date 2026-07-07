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
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedToken = localStorage.getItem("belgodata_token");
    const savedUser = localStorage.getItem("belgodata_user");

    if (savedToken) {
      setToken(savedToken);
      axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Impossible de parser l'utilisateur stocké", error);
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
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