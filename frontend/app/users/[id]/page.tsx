"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Trash2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import KpiCard from "@/components/pages/KpiCard";
import { parseUserAgent } from "@/components/utils/parseUserAgent";
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
  deletionsCount: number;
  trends: { total: number };
  byCategory: StatItem[];
  bySource: StatItem[];
  recent: RecentProspect[];
}

interface DeletionLog {
  _id: string;
  type: "unit" | "bulk";
  prospectName: string | null;
  deletedCount: number;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
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
// Nombre de lignes affichées en aperçu sur le dashboard pour chaque type de log,
// avant de devoir passer par "Voir tout" (pagination complète sur une page dédiée).
const PREVIEW_LOGS_LIMIT = 5;
// Palette harmonisée autour du violet/mauve pour un rendu doux à l'œil.
const COLORS = [
  "#6d5ef0",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#7c3aed",
  "#a855f7",
  "#d8b4fe",
  "#5b52d6",
];

export default function UserDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { token, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [sessions, setSessions] = useState<ScrapingSessionLog[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [loginHistory, setLoginHistory] = useState<LoginLog[]>([]);
  const [loginHistoryTotal, setLoginHistoryTotal] = useState(0);
  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([]);
  const [deletionLogsTotal, setDeletionLogsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("belgodata_token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [statsRes, sessionsRes, loginRes, deletionRes] = await Promise.all([
        axios.get(`${API_URL}/api/auth/users/${userId}/stats`, getAuthConfig()),
        axios.get(`${API_URL}/api/auth/users/${userId}/sessions?limit=${PREVIEW_LOGS_LIMIT}`, getAuthConfig()),
        axios.get(`${API_URL}/api/auth/users/${userId}/login-history?limit=${PREVIEW_LOGS_LIMIT}`, getAuthConfig()),
        axios.get(`${API_URL}/api/auth/users/${userId}/deletion-logs?limit=${PREVIEW_LOGS_LIMIT}`, getAuthConfig()),
      ]);
      setStats(statsRes.data);
      setSessions(sessionsRes.data?.results || []);
      setSessionsTotal(sessionsRes.data?.total || 0);
      setLoginHistory(loginRes.data?.results || []);
      setLoginHistoryTotal(loginRes.data?.total || 0);
      setDeletionLogs(deletionRes.data?.results || []);
      setDeletionLogsTotal(deletionRes.data?.total || 0);
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-violet-50/40 via-white to-slate-50/40">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-violet-100 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-[#6d5ef0] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
        </div>
        <p className="text-sm font-medium text-slate-500">Chargement du dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 bg-gradient-to-br from-violet-50/40 via-white to-slate-50/50 min-h-screen">
        <button
          onClick={() => router.push("/users")}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#6d5ef0] mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Retour aux utilisateurs
        </button>
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 text-red-600 px-4 py-3 rounded-2xl text-sm max-w-xl shadow-sm">
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
    <div className="p-8 bg-gradient-to-br from-violet-50/40 via-white to-slate-50/50 min-h-screen space-y-8 animate-fade-in">
      {/* HEADER */}
      <div className="relative">
        <div className="absolute -top-6 -left-6 w-40 h-40 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" aria-hidden />
        <button
          onClick={() => router.push("/users")}
          className="relative flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#6d5ef0] mb-4 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Retour aux utilisateurs
        </button>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#6d5ef0] via-[#7c6ef2] to-[#8b5cf6] text-white font-bold text-lg shadow-[0_8px_24px_-6px_rgba(109,94,240,0.5)] ring-2 ring-white">
            {stats.user.name ? stats.user.name.slice(0, 2).toUpperCase() : "??"}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-[#6d5ef0] bg-clip-text text-transparent">
              Dashboard de {stats.user.name}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              {stats.user.email} · <span className="text-violet-600 font-semibold">{stats.user.role}</span>
            </p>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
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
        <KpiCard icon={Trash2} label="Suppressions effectuées" value={stats.deletionsCount} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RÉPARTITION PAR SECTEUR */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-6 shadow-[0_4px_24px_-8px_rgba(109,94,240,0.08)] transition-all duration-300 hover:shadow-[0_8px_32px_-8px_rgba(109,94,240,0.15)]">
          <h2 className="font-bold text-slate-800 text-base tracking-tight">Répartition par secteur</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Prospects générés par cet utilisateur</p>

          {categoryData.length === 0 ? (
            <div className="text-sm text-slate-400 py-10 text-center">Aucun prospect pour l&apos;instant.</div>
          ) : (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(30,27,75,0.95)", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px", boxShadow: "0 8px 24px -4px rgba(109,94,240,0.3)" }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-sm">
                {categoryData.slice(0, 6).map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-700 font-medium">{c.name}</span>
                    <span className="text-slate-400">({c.value})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* DERNIERS PROSPECTS */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-6 shadow-[0_4px_24px_-8px_rgba(109,94,240,0.08)] transition-all duration-300 hover:shadow-[0_8px_32px_-8px_rgba(109,94,240,0.15)]">
          <h2 className="font-bold text-slate-800 text-base tracking-tight">Derniers prospects ajoutés</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">5 prospects les plus récents</p>

          {stats.recent.length === 0 ? (
            <div className="text-sm text-slate-400 py-10 text-center">Aucun prospect pour l&apos;instant.</div>
          ) : (
            <ul className="divide-y divide-slate-100/70">
              {stats.recent.map((p) => (
                <li key={p._id} className="py-3 flex items-center justify-between hover:bg-violet-50/30 -mx-2 px-2 rounded-lg transition-colors">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-violet-400" /> {p.address?.city || "—"} {p.address?.postcode ? `(${p.address.postcode})` : ""}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(p.createdAt).toLocaleDateString("fr-BE")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* LOGS DE SCRAPING */}
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-[0_4px_24px_-8px_rgba(109,94,240,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_-8px_rgba(109,94,240,0.15)]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-violet-50/40 via-transparent to-transparent">
          <div className="flex items-center gap-2">
            <History size={16} className="text-violet-500" />
            <h2 className="font-bold text-slate-800 text-base tracking-tight">Logs de recherche (sessions de scraping)</h2>
          </div>
          <Link
            href={`/users/${userId}/logs/sessions`}
            className={`flex items-center gap-1 text-xs font-semibold text-[#6d5ef0] hover:text-[#5b52d6] hover:gap-1.5 transition-all flex-shrink-0 ${
              sessionsTotal <= PREVIEW_LOGS_LIMIT ? "invisible" : ""
            }`}
          >
            Voir tout <ArrowRight size={13} />
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="text-sm text-slate-400 py-10 text-center">
            Aucune session de scraping déclenchée par cet utilisateur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider bg-slate-50/40">
                  <th className="px-6 py-3 font-bold">Date</th>
                  <th className="px-6 py-3 font-bold">Catégorie</th>
                  <th className="px-6 py-3 font-bold">Code postal</th>
                  <th className="px-6 py-3 font-bold text-right">Trouvés</th>
                  <th className="px-6 py-3 font-bold text-right">Insérés</th>
                  <th className="px-6 py-3 font-bold text-right">Doublons ignorés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-6 py-3 text-slate-500 text-xs font-medium">
                      {new Date(s.createdAt).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-800">{s.category}</td>
                    <td className="px-6 py-3 text-slate-600">{s.postalCode}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{s.totalFound}</td>
                    <td className="px-6 py-3 text-right text-emerald-600 font-semibold">{s.inserted}</td>
                    <td className="px-6 py-3 text-right text-slate-400">{s.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HISTORIQUE DE CONNEXION */}
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-[0_4px_24px_-8px_rgba(109,94,240,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_-8px_rgba(109,94,240,0.15)]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-violet-50/40 via-transparent to-transparent">
          <div className="flex items-center gap-2">
            <LogIn size={16} className="text-violet-500" />
            <h2 className="font-bold text-slate-800 text-base tracking-tight">Historique de connexion</h2>
          </div>
          <Link
            href={`/users/${userId}/logs/login-history`}
            className={`flex items-center gap-1 text-xs font-semibold text-[#6d5ef0] hover:text-[#5b52d6] hover:gap-1.5 transition-all flex-shrink-0 ${
              loginHistoryTotal <= PREVIEW_LOGS_LIMIT ? "invisible" : ""
            }`}
          >
            Voir tout <ArrowRight size={13} />
          </Link>
        </div>

        {loginHistory.length === 0 ? (
          <div className="text-sm text-slate-400 py-10 text-center">
            Aucune connexion enregistrée pour cet utilisateur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider bg-slate-50/40">
                  <th className="px-6 py-3 font-bold">Date de connexion</th>
                  <th className="px-6 py-3 font-bold">Adresse IP</th>
                  <th className="px-6 py-3 font-bold">Appareil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {loginHistory.map((l) => (
                  <tr key={l._id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-6 py-3 text-slate-700 font-medium">
                      {new Date(l.createdAt).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">{l.ip || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Monitor size={13} className="text-violet-400" />
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

      {/* LOGS DE SUPPRESSION */}
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-[0_4px_24px_-8px_rgba(109,94,240,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_-8px_rgba(109,94,240,0.15)]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-violet-50/40 via-transparent to-transparent">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-violet-500" />
            <h2 className="font-bold text-slate-800 text-base tracking-tight">Logs de suppression</h2>
          </div>
          <Link
            href={`/users/${userId}/logs/deletions`}
            className={`flex items-center gap-1 text-xs font-semibold text-[#6d5ef0] hover:text-[#5b52d6] hover:gap-1.5 transition-all flex-shrink-0 ${
              deletionLogsTotal <= PREVIEW_LOGS_LIMIT ? "invisible" : ""
            }`}
          >
            Voir tout <ArrowRight size={13} />
          </Link>
        </div>

        {deletionLogs.length === 0 ? (
          <div className="text-sm text-slate-400 py-10 text-center">
            Aucune suppression enregistrée pour cet utilisateur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider bg-slate-50/40">
                  <th className="px-6 py-3 font-bold">Date</th>
                  <th className="px-6 py-3 font-bold">Type</th>
                  <th className="px-6 py-3 font-bold">Détail</th>
                  <th className="px-6 py-3 font-bold text-right">Nb supprimés</th>
                  <th className="px-6 py-3 font-bold">Appareil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {deletionLogs.map((d) => (
                  <tr key={d._id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-6 py-3 text-slate-500 text-xs font-medium">
                      {new Date(d.createdAt).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          d.type === "bulk"
                            ? "bg-rose-50 text-rose-700 border-rose-200/60"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {d.type === "bulk" ? "Suppression groupée" : "Unitaire"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {d.type === "unit" ? (d.prospectName || "Prospect supprimé") : "Suppression par filtre"}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-rose-600">{d.deletedCount}</td>
                    <td className="px-6 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Monitor size={13} className="text-violet-400" />
                        {parseUserAgent(d.userAgent)}
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
