"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, History, LogIn, Trash2, Monitor } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { parseUserAgent } from "@/components/utils/parseUserAgent";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Config par type de log : endpoint API, titre, icône
const LOG_TYPES = {
  sessions: {
    title: "Logs de recherche (sessions de scraping)",
    endpoint: "sessions",
    icon: History,
  },
  "login-history": {
    title: "Historique de connexion",
    endpoint: "login-history",
    icon: LogIn,
  },
  deletions: {
    title: "Logs de suppression",
    endpoint: "deletion-logs",
    icon: Trash2,
  },
} as const;

type LogType = keyof typeof LOG_TYPES;

interface ScrapingSessionLog {
  _id: string;
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

interface DeletionLog {
  _id: string;
  type: "unit" | "bulk";
  prospectName: string | null;
  deletedCount: number;
  userAgent: string | null;
  createdAt: string;
}

type LogRow = ScrapingSessionLog | LoginLog | DeletionLog;

const LIMIT = 25;

export default function UserLogsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const rawType = params?.type as string;
  const { token, loading: authLoading } = useAuth();

  const isValidType = (rawType as LogType) in LOG_TYPES;
  const logType = (isValidType ? rawType : "sessions") as LogType;
  const config = LOG_TYPES[logType];
  const Icon = config.icon;

  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("belgodata_token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  const fetchLogs = useCallback(async () => {
    if (!userId || !isValidType) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/auth/users/${userId}/${config.endpoint}?page=${page}&limit=${LIMIT}`,
        getAuthConfig()
      );
      setRows(res.data?.results || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Erreur chargement des logs :", err);
      setError("Impossible de charger ces logs.");
    } finally {
      setLoading(false);
    }
  }, [userId, page, config.endpoint, isValidType, getAuthConfig]);

  useEffect(() => {
    if (!authLoading) {
      fetchLogs();
    }
  }, [fetchLogs, authLoading]);

  const totalPages = useMemo(() => Math.max(Math.ceil(total / LIMIT), 1), [total]);

  if (!isValidType) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm max-w-xl">
          Type de logs inconnu.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50/30 min-h-screen space-y-6 animate-fade-in">
      <div>
        <button
          onClick={() => router.push(`/users/${userId}`)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#6d5ef0] mb-4"
        >
          <ArrowLeft size={16} /> Retour au dashboard utilisateur
        </button>
        <div className="flex items-center gap-2">
          <Icon size={20} className="text-[#6d5ef0]" />
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{config.title}</h1>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#6d5ef0] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-400">Chargement...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 m-6 rounded-xl text-sm">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-400 py-16 text-center">Aucun log trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider bg-slate-50/20">
                  {logType === "sessions" && (
                    <>
                      <th className="px-6 py-3 font-bold">Date</th>
                      <th className="px-6 py-3 font-bold">Catégorie</th>
                      <th className="px-6 py-3 font-bold">Code postal</th>
                      <th className="px-6 py-3 font-bold text-right">Trouvés</th>
                      <th className="px-6 py-3 font-bold text-right">Insérés</th>
                      <th className="px-6 py-3 font-bold text-right">Doublons ignorés</th>
                    </>
                  )}
                  {logType === "login-history" && (
                    <>
                      <th className="px-6 py-3 font-bold">Date de connexion</th>
                      <th className="px-6 py-3 font-bold">Adresse IP</th>
                      <th className="px-6 py-3 font-bold">Appareil</th>
                    </>
                  )}
                  {logType === "deletions" && (
                    <>
                      <th className="px-6 py-3 font-bold">Date</th>
                      <th className="px-6 py-3 font-bold">Type</th>
                      <th className="px-6 py-3 font-bold">Détail</th>
                      <th className="px-6 py-3 font-bold text-right">Nb supprimés</th>
                      <th className="px-6 py-3 font-bold">Appareil</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logType === "sessions" &&
                  (rows as ScrapingSessionLog[]).map((s) => (
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

                {logType === "login-history" &&
                  (rows as LoginLog[]).map((l) => (
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

                {logType === "deletions" &&
                  (rows as DeletionLog[]).map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3 text-gray-500 text-xs font-medium">
                        {new Date(d.createdAt).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            d.type === "bulk"
                              ? "bg-red-50 text-red-700 border-red-200/60"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {d.type === "bulk" ? "Suppression groupée" : "Unitaire"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {d.type === "unit" ? (d.prospectName || "Prospect supprimé") : "Suppression par filtre"}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-red-600">{d.deletedCount}</td>
                      <td className="px-6 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Monitor size={13} className="text-gray-400" />
                          {parseUserAgent(d.userAgent)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-semibold">
            <p>
              Page {page} sur {totalPages} · {total} résultats
            </p>
            <div className="flex gap-1 items-center">
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"
              >
                «
              </button>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"
              >
                ‹
              </button>
              <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">{page}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"
              >
                ›
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
