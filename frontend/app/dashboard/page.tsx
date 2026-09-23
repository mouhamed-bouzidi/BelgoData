"use client";

import { Building2, Mail, Globe, MapPin, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import KpiCard from "@/components/pages/KpiCard";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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
  phone: string | null;
  email: string | null;
  source: string;
  createdAt: string;
}

interface Stats {
  total: number;
  emailsCount: number;
  websitesCount: number;
  byCategory: StatItem[];
  bySource: StatItem[];
  byPostcode: StatItem[];
  recent: RecentProspect[];
}

interface ProvinceStat {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
// Palette mauve/violet homogène, douce pour les yeux
const COLORS = [
  "#7c6df2",
  "#9d8bf5",
  "#b8a4f7",
  "#6d5ef0",
  "#c084fc",
  "#a78bfa",
  "#8b5cf6",
  "#d8b4fe",
  "#e9d5ff",
  "#6366f1",
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [geoStats, setGeoStats] = useState<ProvinceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, geoRes] = await Promise.all([
          axios.get(`${API_URL}/api/prospects/stats`),
          axios.get(`${API_URL}/api/prospects/dashboard/geo-distribution`),
        ]);
        setStats(statsRes.data);
        setGeoStats(Array.isArray(geoRes?.data?.data) ? geoRes.data.data : (geoRes?.data || []));
      } catch (error) {
        console.error("Erreur chargement stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-4 text-center bg-gradient-to-br from-violet-50/40 via-white to-purple-50/30">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-[#7c6df2] rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-violet-400/10 blur-xl"></div>
        </div>
        <p className="text-sm font-medium text-slate-500 tracking-wide">Chargement de l&apos;écosystème BelgoData…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 sm:p-8 text-center bg-rose-50/60 border border-rose-100 rounded-2xl max-w-xl mx-4 sm:mx-auto mt-12 sm:mt-20 shadow-[0_8px_24px_-12px_rgba(244,63,94,0.15)]">
        <p className="text-rose-500 font-semibold text-sm sm:text-base">
          Erreur critique lors de la récupération des données.
        </p>
      </div>
    );
  }

  const categoryData = stats.byCategory.map((c) => ({
    name: c._id || "Autre",
    value: c.count,
  }));

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8 min-h-screen space-y-6 sm:space-y-8 animate-fade-in bg-gradient-to-br from-violet-50/40 via-white to-purple-50/30 text-slate-800">

      {/* CSS Injecté pour customiser la scrollbar de la liste par secteur */}
      <style jsx global>{`
        .premium-sector-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .premium-sector-scrollbar::-webkit-scrollbar-track {
          background: #f5f3ff;
          border-radius: 10px;
        }
        .premium-sector-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #c4b5fd, #a78bfa);
          border-radius: 10px;
          transition: background 0.25s ease;
        }
        .premium-sector-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #a78bfa, #7c6df2);
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-purple-100/70 text-purple-700 text-xs font-medium ring-1 ring-purple-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
            Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-800 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            Vue analytique et intelligence de marché sur la Belgique
          </p>
        </div>
        <div className="flex w-fit shrink-0 items-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-sm border border-violet-100 shadow-[0_4px_16px_-6px_rgba(124,109,242,0.15)] rounded-xl px-3 sm:px-4 py-2 sm:py-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="whitespace-nowrap">Données synchronisées</span>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <KpiCard icon={Building2} label="Total entreprises" value={stats.total} color="accent" />
        <KpiCard icon={Mail} label="Emails trouvés" value={stats.emailsCount} color="blue" />
        <KpiCard icon={Globe} label="Sites web trouvés" value={stats.websitesCount} color="green" />
        <KpiCard icon={MapPin} label="Codes postaux couverts" value={stats.byPostcode.length} color="orange" />
      </div>

      {/* GRAPH SECTIONS */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">

        {/* BLOCK : RÉPARTITION PAR SECTEUR */}
        <div className="relative bg-white/90 backdrop-blur-sm border border-violet-100/70 rounded-2xl p-4 sm:p-6 shadow-[0_8px_28px_-14px_rgba(124,109,242,0.18)] flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_32px_-12px_rgba(124,109,242,0.28)] hover:border-violet-200 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-violet-200/30 to-transparent rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative min-w-0">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Répartition par secteur</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Segmentation d&apos;activité de vos leads</p>
          </div>

          <div className="relative mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-center">
            {/* Donut : largeur fluide sur mobile, taille fixe dès lg */}
            <div className="relative mx-auto flex h-[180px] w-full max-w-[220px] shrink-0 items-center justify-center lg:mx-0 lg:w-[180px] lg:max-w-none">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-100/60 to-purple-100/40 blur-xl"></div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="66%"
                    outerRadius="94%"
                    paddingAngle={3}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} className="focus:outline-none transition-all duration-300" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "rgba(30, 27, 75, 0.95)", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px", boxShadow: "0 8px 24px -8px rgba(124,109,242,0.4)" }}
                    itemStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-black text-slate-900">{stats.total}</span>
                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Leads</span>
              </div>
            </div>

            <div className="w-full min-w-0 flex-1 space-y-2 max-h-[190px] overflow-y-auto pr-1 sm:pr-3 premium-sector-scrollbar">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between gap-2 text-xs group p-1.5 rounded-lg hover:bg-violet-50/70 transition-colors">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm ring-2 ring-white"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-slate-600 font-medium truncate group-hover:text-slate-900 transition-colors">{c.name}</span>
                  </div>
                  <span className="shrink-0 font-bold text-slate-800 bg-violet-50/80 px-2 py-0.5 rounded text-[11px] group-hover:bg-white group-hover:text-[#7c6df2] transition-colors">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BLOCK : ANALYSE GÉOGRAPHIQUE */}
        <div className="relative bg-gradient-to-br from-white to-violet-50/40 border border-violet-100/70 rounded-2xl p-4 sm:p-6 shadow-[0_8px_28px_-14px_rgba(124,109,242,0.18)] flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_32px_-12px_rgba(124,109,242,0.28)] hover:border-violet-200 overflow-hidden">
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-purple-200/30 to-transparent rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Analyse Géographique</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Top 5 des zones de prospection les plus denses</p>
              </div>
              <span className="w-fit shrink-0 bg-gradient-to-r from-violet-100 to-purple-100 text-[#6d5ef0] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-violet-200/60">
                Top Provinces
              </span>
            </div>
          </div>

          <div className="relative space-y-4 my-auto mt-6">
            {geoStats.slice(0, 5).map((province, index) => {
              const rankColors = [
                "bg-gradient-to-br from-[#7c6df2] to-[#a78bfa] text-white font-black shadow-md shadow-violet-300/40",
                "bg-gradient-to-br from-violet-500 to-violet-400 text-white font-bold shadow-sm shadow-violet-200/50",
                "bg-violet-100 text-[#6d5ef0] font-bold",
                "bg-violet-50 text-violet-500 font-medium",
                "bg-slate-50 text-slate-400 font-normal",
              ];

              return (
                <div
                  key={province.name || province.id}
                  className="group flex items-center gap-3 sm:gap-4 p-2 rounded-xl transition-all duration-200 hover:bg-white/70 hover:shadow-sm"
                >
                  <div className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center shrink-0 ${rankColors[index] || rankColors[4]}`}>
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                      <span className="min-w-0 truncate font-bold text-slate-800 group-hover:text-[#6d5ef0] transition-colors">
                        {province.name || "Province inconnue"}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-extrabold text-slate-900 bg-violet-50 px-1.5 py-0.5 rounded text-[11px] group-hover:bg-violet-100 group-hover:text-[#6d5ef0] transition-colors">
                          {province.count.toLocaleString()}
                        </span>
                        <span className="text-[#7c6df2] font-bold w-9 text-right">{province.percentage}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-violet-100/60 h-2 rounded-full overflow-hidden relative">
                      <div
                        className="bg-gradient-to-r from-[#7c6df2] via-[#9d8bf5] to-[#c084fc] h-full rounded-full transition-all duration-700 ease-out relative group-hover:brightness-110 shadow-sm"
                        style={{ width: `${province.percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {geoStats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-2xl mb-2">📍</span>
                <p className="text-xs text-slate-400 max-w-[200px]">Aucune donnée géographique.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DERNIERS PROSPECTS */}
      <div className="bg-white/90 backdrop-blur-sm border border-violet-100/70 rounded-2xl shadow-[0_8px_28px_-14px_rgba(124,109,242,0.18)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_32px_-12px_rgba(124,109,242,0.25)]">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-violet-100/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-violet-50/50 to-purple-50/30">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Derniers prospects ajoutés</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Historique temps réel des entrées en base</p>
          </div>
          <a
            href="/prospects"
            className="w-full sm:w-auto justify-center text-xs font-bold text-[#6d5ef0] bg-gradient-to-r from-violet-50 to-purple-50 px-3 py-2 sm:py-1.5 rounded-xl flex items-center gap-1 hover:from-[#7c6df2] hover:to-[#a78bfa] hover:text-white transition-all duration-300 group shadow-sm ring-1 ring-violet-100"
          >
            Voir tous les prospects
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        {/* Vue mobile : cartes empilées (pas de scroll horizontal) */}
        <ul className="divide-y divide-violet-50/70 md:hidden">
          {stats.recent.map((p) => (
            <li key={p._id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 font-bold text-slate-800 text-sm break-words">{p.name}</p>
                <span className="shrink-0 bg-violet-50 text-[#7c6df2] px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border border-violet-100">
                  {p.source}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-gradient-to-r from-violet-50 to-purple-50 text-[#6d5ef0] px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-violet-100">
                  {p.category}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {p.address?.city || p.address?.postcode || "—"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 break-all">{p.phone || p.email || "—"}</p>
            </li>
          ))}
        </ul>

        {/* Vue desktop : tableau */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm text-left">
            <thead>
              <tr className="text-violet-400 border-b border-violet-100/60 text-[11px] font-bold uppercase tracking-wider bg-violet-50/20">
                <th className="px-6 py-3.5 font-bold">Nom de l&apos;entreprise</th>
                <th className="px-6 py-3.5 font-bold">Secteur</th>
                <th className="px-6 py-3.5 font-bold">Ville</th>
                <th className="px-6 py-3.5 font-bold">Source</th>
                <th className="px-6 py-3.5 font-bold">Contact / Médias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50/70">
              {stats.recent.map((p) => (
                <tr key={p._id} className="hover:bg-violet-50/40 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-[#6d5ef0] transition-colors">{p.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-gradient-to-r from-violet-50 to-purple-50 text-[#6d5ef0] px-2.5 py-1 rounded-lg text-xs font-semibold border border-violet-100 shadow-sm whitespace-nowrap">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {p.address?.city || p.address?.postcode || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-violet-50 text-[#7c6df2] px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border border-violet-100">
                      {p.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs font-mono max-w-[200px] truncate">
                    {p.phone || p.email || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
