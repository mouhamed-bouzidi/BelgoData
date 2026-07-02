"use client";

import { Building2, Mail, Globe, MapPin, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const COLORS = [
  "#6d5ef0", // violet principal
  "#3b82f6", // bleu
  "#10b981", // vert
  "#f59e0b", // orange
  "#ec4899", // rose
  "#06b6d4", // cyan
  "#8b5cf6", // violet clair
  "#ef4444", // rouge
  "#14b8a6", // teal
  "#f97316", // orange foncé
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#6d5ef0] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-400">Chargement de l&apos;écosystème BelgoData...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center bg-red-50/50 border border-red-100 rounded-2xl max-w-xl mx-auto mt-20">
        <p className="text-red-500 font-semibold">Erreur critique lors de la récupération des données.</p>
      </div>
    );
  }

  const categoryData = stats.byCategory.map((c) => ({
    name: c._id || "Autre",
    value: c.count,
  }));

  return (
    <div className="p-8 bg-slate-50/30 min-h-screen space-y-8 animate-fade-in">
      
      {/* CSS Injecté pour customiser la scrollbar de la liste par secteur */}
      <style jsx global>{`
        /* Design Premium pour la scrollbar des secteurs */
        .premium-sector-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .premium-sector-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .premium-sector-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          transition: background 0.2s ease;
        }
        .premium-sector-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6d5ef0; /* Devient violette au survol pour un effet ultra réactif */
        }
      `}</style>

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm font-medium text-gray-400 mt-0.5">
            Vue analytique et intelligence de marché sur la Belgique
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
          <span>Données synchronisées</span>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-4 gap-5">
        <KpiCard icon={Building2} label="Total entreprises" value={stats.total} color="accent" />
        <KpiCard icon={Mail} label="Emails trouvés" value={stats.emailsCount} color="blue" />
        <KpiCard icon={Globe} label="Sites web trouvés" value={stats.websitesCount} color="green" />
        <KpiCard icon={MapPin} label="Codes postaux couverts" value={stats.byPostcode.length} color="orange" />
      </div>

      {/* GRAPH SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BLOCK : RÉPARTITION PAR SECTEUR AVEC SCROLLBAR AMÉLIORÉE */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <h2 className="font-bold text-gray-900 text-base tracking-tight">Répartition par secteur</h2>
            <p className="text-xs text-gray-400 mt-0.5">Segmentation d&apos;activité de vos leads</p>
          </div>
          
          <div className="flex items-center gap-8 mt-6">
            <div className="relative flex items-center justify-center shrink-0">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} className="focus:outline-none transition-all duration-300" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#111827', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-gray-900">{stats.total}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Leads</span>
              </div>
            </div>

            {/* 🎯 APPLICATION DE LA SCROLLBAR PREMIUM ICI */}
            <div className="flex-1 space-y-2.5 max-h-[190px] overflow-y-auto pr-3 premium-sector-scrollbar">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs group p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-gray-600 font-medium truncate max-w-[140px] group-hover:text-gray-900 transition-colors">{c.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 bg-slate-50 px-2 py-0.5 rounded text-[11px] group-hover:bg-white transition-colors">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BLOCK : ANALYSE GÉOGRAPHIQUE CRÉATIVE */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-gray-900 text-base tracking-tight">Analyse Géographique</h2>
                <p className="text-xs text-gray-400 mt-0.5">Top 5 des zones de prospection les plus denses</p>
              </div>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-indigo-100/30">
                Top Provinces
              </span>
            </div>
          </div>

          <div className="space-y-4 my-auto mt-6">
            {geoStats.slice(0, 5).map((province, index) => {
              const rankColors = [
                "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black",
                "bg-indigo-500 text-white font-bold",
                "bg-indigo-100 text-indigo-700 font-bold",
                "bg-slate-100 text-slate-600 font-medium",
                "bg-slate-50 text-slate-400 font-normal"
              ];

              return (
                <div 
                  key={province.name || province.id} 
                  className="group flex items-center space-x-4 p-2 rounded-xl transition-all duration-200 hover:bg-white hover:shadow-sm hover:scale-[1.01]"
                >
                  <div className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center shrink-0 shadow-sm ${rankColors[index] || rankColors[4]}`}>
                    {index + 1}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-800 group-hover:text-[#6d5ef0] transition-colors">
                        {province.name || "Province inconnue"}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-gray-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          {province.count.toLocaleString()}
                        </span>
                        <span className="text-indigo-500 font-bold w-9 text-right">{province.percentage}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                      <div
                        className="bg-gradient-to-r from-[#6d5ef0] to-[#8b5cf6] h-full rounded-full transition-all duration-700 ease-out relative group-hover:brightness-110 shadow-sm"
                        style={{ width: `${province.percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
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

      {/* TABLEAU DES DERNIERS PROSPECTS */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/40">
          <div>
            <h2 className="font-bold text-gray-900 text-base tracking-tight">Derniers prospects ajoutés</h2>
            <p className="text-xs text-gray-400 mt-0.5">Historique temps réel des entrées en base</p>
          </div>
          <a 
            href="/prospects" 
            className="text-xs font-bold text-[#6d5ef0] bg-indigo-50 Hex-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-[#6d5ef0] hover:text-white transition-all duration-200 group shadow-sm"
          >
            Voir tous les prospects 
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider bg-slate-50/20">
                <th className="px-6 py-3.5 font-bold">Nom de l&apos;entreprise</th>
                <th className="px-6 py-3.5 font-bold">Secteur</th>
                <th className="px-6 py-3.5 font-bold">Ville</th>
                <th className="px-6 py-3.5 font-bold">Source</th>
                <th className="px-6 py-3.5 font-bold">Contact / Médias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recent.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-[#6d5ef0] transition-colors">{p.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-50 text-[#6d5ef0] px-2.5 py-1 rounded-lg text-xs font-semibold border border-indigo-100/40 shadow-sm">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-medium">
                    {p.address?.city || p.address?.postcode || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border border-blue-100/40">
                      {p.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs font-mono max-w-[200px] truncate">
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