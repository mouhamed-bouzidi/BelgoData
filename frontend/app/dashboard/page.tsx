"use client";
import { Building2, Mail, Globe, MapPin } from "lucide-react";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const COLORS = [
  "#6d5ef0", // violet
  "#3b82f6", // bleu
  "#10b981", // vert
  "#f59e0b", // orange
  "#ec4899", // rose
  "#06b6d4", // cyan
  "#8b5cf6", // violet clair
  "#ef4444", // rouge
  "#14b8a6", // teal
  "#f97316", // orange foncé
  "#94a3b8", // gris (fallback)
];
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await axios.get(`${API_URL}/api/prospects/stats`);
        setStats(res.data);
      } catch (error) {
        console.error("Erreur chargement stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Chargement...</div>;
  }

  if (!stats) {
    return <div className="p-8 text-center text-red-500">Erreur de chargement des statistiques.</div>;
  }

  const categoryData = stats.byCategory.map((c) => ({
    name: c._id || "Autre",
    value: c.count,
  }));

  const sourceData = stats.bySource.map((s) => ({
    name: s._id.toUpperCase(),
    value: s.count,
  }));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Vue d&apos;ensemble de vos données de prospection</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
  <KpiCard icon={Building2} label="Total entreprises" value={stats.total} color="accent" />
  <KpiCard icon={Mail} label="Emails trouvés" value={stats.emailsCount} color="blue" />
  <KpiCard icon={Globe} label="Sites web trouvés" value={stats.websitesCount} color="green" />
  <KpiCard
    icon={MapPin}
    label="Codes postaux couverts"
    value={stats.byPostcode.length}
    color="orange"
  />
</div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Répartition par secteur */}
        <div className="bg-card-bg border border-border-color rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Répartition par secteur</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-gray-600">{c.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sources des données */}
        <div className="bg-card-bg border border-border-color rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Sources des données</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {sourceData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-gray-600">{s.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Derniers prospects ajoutés */}
      <div className="bg-card-bg border border-border-color rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-color flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Derniers prospects ajoutés</h2>
          <a href="/prospects" className="text-sm text-accent font-medium">
            Voir tous les prospects →
          </a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border-color">
              <th className="px-5 py-3 font-medium">Nom de l&apos;entreprise</th>
              <th className="px-5 py-3 font-medium">Secteur</th>
              <th className="px-5 py-3 font-medium">Ville</th>
              <th className="px-5 py-3 font-medium">Source</th>
              <th className="px-5 py-3 font-medium">Contact</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map((p) => (
              <tr key={p._id} className="border-b border-border-color last:border-0">
                <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-5 py-3">
                  <span className="bg-accent-light text-accent px-2 py-1 rounded-md text-xs">
                    {p.category}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {p.address?.city || p.address?.postcode || "—"}
                </td>
                <td className="px-5 py-3">
                  <span className="bg-blue/10 text-blue px-2 py-1 rounded-md text-xs uppercase">
                    {p.source}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{p.phone || p.email || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}