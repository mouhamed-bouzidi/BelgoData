"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { FileSpreadsheet, FileText, Download, Building2, FileBarChart, ShieldAlert, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ExportsPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();

  const [stats, setStats] = useState({ totalProspects: 0, totalReports: 0 });
  const [category, setCategory] = useState("Tous les secteurs");
  const [postalCode, setPostalCode] = useState("Toutes");

  // Restriction d'accès stricte : Seuls les Admin et Commerciaux passent
  const canAccess = user?.role === "Administrateur" || user?.role === "Commercial";

  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  useEffect(() => {
    if (loading || !canAccess) return;

    async function fetchStats() {
      try {
        const config = getAuthConfig();
        const [prospectsRes, reportsRes] = await Promise.all([
          axios.get(`${API_URL}/api/prospects/stats`, config),
          axios.get(`${API_URL}/api/reports`, { ...config, params: { limit: 1 } }),
        ]);
        setStats({
          totalProspects: prospectsRes.data.total,
          totalReports: reportsRes.data.total,
        });
      } catch (error) {
        console.error("Erreur chargement stats exports:", error);
      }
    }
    fetchStats();
  }, [canAccess, loading, getAuthConfig]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f8fafc]">
        <p className="text-sm font-medium text-slate-500">Chargement...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4 text-center">
        <div className="p-4 bg-red-50 rounded-2xl text-red-600 mb-4 shadow-sm border border-red-100">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-950 mb-2">Accès restreint</h1>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          Votre profil ne dispose pas des autorisations nécessaires pour accéder à l&apos;exportation des données de BelgoData.
        </p>
        <button
          onClick={() => router.push("/prospects")}
          className="w-full max-w-xs px-4 py-2.5 bg-[#5046e5] hover:bg-[#4338ca] text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          Retour aux prospects
        </button>
      </div>
    );
  }

  function buildProspectsExportUrl(format: "csv" | "excel") {
    const params = new URLSearchParams();
    if (category !== "Tous les secteurs") params.append("category", category);
    if (postalCode !== "Toutes") params.append("postal_code", postalCode);

    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
    if (activeToken) params.append("token", activeToken);

    return `${API_URL}/api/prospects/export/${format}?${params.toString()}`;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-purple-100/70 text-purple-700 text-xs font-medium ring-1 ring-purple-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
            Exports
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-800 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent tracking-tight">
            Exports
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Téléchargez vos données de prospection ou vos bilans IA en quelques clics.
          </p>
        </div>
        <div className="w-fit shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-2 shadow-sm">
          <Lock size={13} className="text-emerald-600 shrink-0" />
          <span className="truncate">Accès autorisé ({user?.role})</span>
        </div>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card-bg border border-border-color rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-gray-500 truncate">Prospects disponibles</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalProspects}</div>
          </div>
        </div>
        <div className="bg-card-bg border border-border-color rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-blue/10 text-blue flex items-center justify-center">
            <FileBarChart size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-gray-500 truncate">Bilans générés</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalReports}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Prospects */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-1">
            <Building2 size={20} className="text-accent shrink-0" />
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Exporter les prospects</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mb-5">
            Exportez tout ou partie de votre base de prospects, avec filtres optionnels.
          </p>

          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Secteur</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full max-w-full p-2.5 text-sm rounded-lg border border-border-color bg-white"
              >
                <option>Tous les secteurs</option>
                <option>Restauration &amp; Café</option>
                <option>Alimentation &amp; Boulangerie</option>
                <option>Industrie &amp; Production</option>
                <option>Artisanat &amp; Construction</option>
                <option>Commerce &amp; Retail</option>
                <option>Administration &amp; Secteur Public</option>
                <option>Services aux Entreprises</option>
                <option>Finance &amp; Juridique</option>
                <option>Immobilier</option>
                <option>Tech &amp; Télécom</option>
                <option>Asbl &amp; ONG</option>
                <option>Éducation &amp; Recherche</option>
                <option>Santé</option>
                <option>Culture &amp; Loisirs</option>
                <option>Hôtellerie &amp; Tourisme</option>
                <option>Transport &amp; Logistique</option>
                <option>Autre</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Code postal</label>
              <select
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full max-w-full p-2.5 text-sm rounded-lg border border-border-color bg-white"
              >
                <option>Toutes</option>
                <option value="1000">Bruxelles (1000)</option>
                <option value="2000">Anvers (2000)</option>
                <option value="3000">Louvain (3000)</option>
                <option value="4000">Liège (4000)</option>
                <option value="5000">Namur (5000)</option>
                <option value="9000">Gand (9000)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={buildProspectsExportUrl("csv")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border-color rounded-lg text-sm font-medium text-gray-700 hover:bg-content-bg transition-colors"
            >
              <FileText size={16} /> CSV
            </a>

            <a
              href={buildProspectsExportUrl("excel")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              <FileSpreadsheet size={16} /> Excel
            </a>
          </div>
        </div>

        {/* Export Bilans */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-1">
            <FileBarChart size={20} className="text-blue shrink-0" />
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Exporter un bilan</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mb-5">
            Les bilans s&apos;exportent individuellement en PDF ou Excel depuis leur page dédiée.
          </p>

          <div className="bg-content-bg rounded-lg p-4 mb-5">
            <p className="text-xs sm:text-sm text-gray-600">
              Rendez-vous sur Rapports &amp; Bilans pour consulter et exporter un bilan de prospection généré par l&apos;IA.
            </p>
          </div>

          <Link
            href="/rapports"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            <Download size={16} /> Voir les bilans
          </Link>
        </div>
      </div>
    </div>
  );
}
