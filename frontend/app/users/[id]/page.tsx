"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  Mail,
  Globe,
  Flame,
  History,
  MapPin,
  LogIn,
  Monitor,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import KpiCard from "@/components/pages/KpiCard";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface StatItem {
  _id: string;
  count: number;
}

interface RecentProspect {
  _id: string;
  name: string;
  category: string;
  address: { city: string | null; postcode: string | null };
  createdAt: string;
}

interface UserStats {
  user: { id: string; name: string; email: string; role: string };
  total: number;
  emailsCount: number;
  websitesCount: number;
  avgScore: number;
  hotLeads: number;
  sessionsCount: number;
  trends: { total: number };
  byCategory: StatItem[];
  bySource: StatItem[];
  recent: RecentProspect[];
}

interface ScrapingSessionLog {
  _id: string;
  sessionId: string;
  category: string;
  postalCode: string;
  totalFound: number;
  inserted: number;
  skipped: number;
  createdAt: string;
}

interface LoginLog {
  _id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const COLORS = [
  "#6d5ef0",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#ef4444",
];

export default function UserDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { token, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [sessions, setSessions] = useState<ScrapingSessionLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Extrait un libellé simple "Navigateur · OS" à partir du user-agent brut, sans dépendance externe
  function parseUserAgent(ua: string | null): string {
    if (!ua) return "Inconnu";
    const browser =
      /Edg\//.test(ua) ? "Edge" :
      /Chrome\//.test(ua) ? "Chrome" :
      /Firefox\//.test(ua) ? "Firefox" :
      /Safari\//.test(ua) ? "Safari" :
      "Navigateur";
    const os =
      /Windows/.test(ua) ? "Windows" :
      /Mac OS/.test(ua) ? "macOS" :
      /Android/.test(ua) ? "Android" :
      /iPhone|iPad/.test(ua) ? "iOS" :
      /Linux/.test(ua) ? "Linux" :
      "OS inconnu";
    return `${browser} · ${os}`;
  }

  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [statsRes, sessionsRes, loginRes] = await Promise.all([
        axios.get(`${API_URL}/api/auth/users/${userId}/stats`, getAuthConfig()),
        axios.get(`${API_URL}/api/auth/users/${userId}/sessions?limit=20`, getAuthConfig()),
        axios.get(`${API_URL}/api/auth/users/${userId}/login-history?limit=20`, getAuthConfig()),
      ]);
      setStats(statsRes.data);
      setSessions(sessionsRes.data?.results || []);
      setLoginHistory(loginRes.data?.results || []);
    } catch (err) {
      console.error("Erreur chargement dashboard utilisateur :", err);
      setError("Impossible de charger le dashboard de cet utilisateur.");
    } finally {
      setLoading(false);
    }
  }, [userId, getAuthConfig]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#6d5ef0] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-400">Chargement du dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push("/users")}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#6d5ef0] mb-6"
        >
          <ArrowLeft size={16} /> Retour aux utilisateurs
        </button>
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm max-w-xl">
          {error || "Utilisateur introuvable."}
        </div>
      </div>
    );
  }

  const categoryData = stats.byCategory.map((c) => ({
    name: c._id || "Autre",
    value: c.count,
  }));

  return (
    <div className="p-8 bg-slate-50/30 min-h-screen space-y-8 animate-fade-in">
      {/* HEADER */}
      <div>
        <button
          onClick={() => router.push("/users")}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#6d5ef0] mb-4"
        >
          <ArrowLeft size={16} /> Retour aux utilisateurs
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#6d5ef0] to-[#8b5cf6] text-white font-bold shadow-sm">
            {stats.user.name ? stats.user.name.slice(0, 2).toUpperCase() : "??"}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Dashboard de {stats.user.name}
            </h1>
            <p className="text-sm font-medium text-gray-400">
              {stats.user.email} · {stats.user.role}
            </p>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        <KpiCard
          icon={Building2}
          label="Prospects trouvés"
          value={stats.total}
          trend={`${stats.trends.total > 0 ? "+" : ""}${stats.trends.total}% (30j)`}
          color="accent"
        />
        <KpiCard icon={Mail} label="Emails trouvés" value={stats.emailsCount} color="blue" />
        <KpiCard icon={Globe} label="Sites web trouvés" value={stats.websitesCount} color="green" />
        <KpiCard icon={Flame} label="Leads chauds (score ≥ 80)" value={stats.hotLeads} color="orange" />
        <KpiCard icon={History} label="Sessions de scraping" value={stats.sessionsCount} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RÉPARTITION PAR SECTEUR */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-base tracking-tight">Répartition par secteur</h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-4">Prospects générés par cet utilisateur</p>

          {categoryData.length === 0 ? (
            <div className="text-sm text-gray-400 py-10 text-center">Aucun prospect pour l&apos;instant.</div>
          ) : (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111827", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-sm">
                {categoryData.slice(0, 6).map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-700 font-medium">{c.name}</span>
                    <span className="text-gray-400">({c.value})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* DERNIERS PROSPECTS */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-base tracking-tight">Derniers prospects ajoutés</h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-4">5 prospects les plus récents</p>

          {stats.recent.length === 0 ? (
            <div className="text-sm text-gray-400 py-10 text-center">Aucun prospect pour l&apos;instant.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {stats.recent.map((p) => (
                <li key={p._id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{p.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {p.address?.city || "—"} {p.address?.postcode ? `(${p.address.postcode})` : ""}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {new Date(p.createdAt).toLocaleDateString("fr-BE")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* LOGS DE SCRAPING */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <History size={16} className="text-gray-400" />
          <h2 className="font-bold text-gray-900 text-base tracking-tight">Logs de recherche (sessions de scraping)</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">
            Aucune session de scraping déclenchée par cet utilisateur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider bg-slate-50/20">
                  <th className="px-6 py-3 font-bold">Date</th>
                  <th className="px-6 py-3 font-bold">Catégorie</th>
                  <th className="px-6 py-3 font-bold">Code postal</th>
                  <th className="px-6 py-3 font-bold text-right">Trouvés</th>
                  <th className="px-6 py-3 font-bold text-right">Insérés</th>
                  <th className="px-6 py-3 font-bold text-right">Doublons ignorés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3 text-gray-500 text-xs font-medium">
                      {new Date(s.createdAt).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-3 font-semibold text-gray-800">{s.category}</td>
                    <td className="px-6 py-3 text-gray-600">{s.postalCode}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{s.totalFound}</td>
                    <td className="px-6 py-3 text-right text-emerald-600 font-semibold">{s.inserted}</td>
                    <td className="px-6 py-3 text-right text-gray-400">{s.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HISTORIQUE DE CONNEXION */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <LogIn size={16} className="text-gray-400" />
          <h2 className="font-bold text-gray-900 text-base tracking-tight">Historique de connexion</h2>
        </div>

        {loginHistory.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">
            Aucune connexion enregistrée pour cet utilisateur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider bg-slate-50/20">
                  <th className="px-6 py-3 font-bold">Date de connexion</th>
                  <th className="px-6 py-3 font-bold">Adresse IP</th>
                  <th className="px-6 py-3 font-bold">Appareil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loginHistory.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3 text-gray-700 font-medium">
                      {new Date(l.createdAt).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{l.ip || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Monitor size={13} className="text-gray-400" />
                        {parseUserAgent(l.userAgent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}