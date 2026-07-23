"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CategoryBadge, CategoryIconCircle } from "@/components/utils/categoryIcons";
import { Trash2, Eye, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Report {
  _id: string;
  prospect_id: string;
  name: string;
  category: string;
  address: { city?: string; postcode?: string };
  score: number;
  presence_digitale: string;
  createdAt: string;
  requestedBy?: { userName?: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ReportsListPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const limit = 20;

  // Restriction stricte : Seuls les Admin et Commerciaux peuvent modifier/supprimer
  const canModify = user?.role === "Administrateur" || user?.role === "Commercial";

  // Helper pour injecter le token d'authentification
  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const config = {
        ...getAuthConfig(),
        params: { page, limit }
      };
      const res = await axios.get(`${API_URL}/api/reports`, config);
      setReports(res.data.results || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error("Erreur chargement bilans:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, getAuthConfig]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleDelete(id: string, name: string) {
    if (!canModify) return;
    if (!confirm(`Supprimer le bilan de "${name}" ?`)) return;

    try {
      await axios.delete(`${API_URL}/api/reports/${id}`, getAuthConfig());
      setReports((prev) => prev.filter((r) => r._id !== id));
      setTotal((prev) => prev - 1);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression du bilan.");
    }
  }

  async function handleBulkDelete() {
    if (!canModify || selectedIds.length === 0) return;
    if (!confirm(`Supprimer ${selectedIds.length} bilan(s) sélectionné(s) ?`)) return;

    try {
      const config = getAuthConfig();
      await Promise.all(selectedIds.map((id) => axios.delete(`${API_URL}/api/reports/${id}`, config)));
      setReports((prev) => prev.filter((r) => !selectedIds.includes(r._id)));
      setTotal((prev) => prev - selectedIds.length);
      setSelectedIds([]);
    } catch (error) {
      console.error("Erreur suppression en masse:", error);
      alert("Erreur lors de la suppression groupée.");
    }
  }

  const scoreColor = (score: number) =>
    score >= 70
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
      : score >= 50
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60"
      : "bg-rose-50 text-rose-600 ring-1 ring-rose-200/60";

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-purple-50/40 via-white to-fuchsia-50/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-purple-100/70 text-purple-700 text-xs font-medium ring-1 ring-purple-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            Historique IA
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-800 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent tracking-tight">
            Rapports &amp; Bilans
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Historique de tous les bilans de prospection générés par l&apos;IA
          </p>
        </div>

        {/* Le bouton de suppression groupée s'affiche uniquement si l'utilisateur a les droits */}
        {selectedIds.length > 0 && canModify && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-rose-50 to-red-50 text-rose-600 px-4 py-2.5 rounded-xl ring-1 ring-rose-200/60 shadow-sm shadow-rose-200/40 hover:shadow-md hover:shadow-rose-200/50 hover:from-rose-100 hover:to-red-100 transition-all duration-300"
          >
            <Trash2 size={16} /> Supprimer ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-sm border border-purple-100/70 rounded-2xl overflow-hidden shadow-lg shadow-purple-100/40 transition-all duration-300 hover:shadow-purple-200/40">
        <div className="px-6 py-4 border-b border-purple-100/70 text-sm text-gray-600 bg-gradient-to-r from-purple-50/60 to-transparent flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="font-medium text-purple-900/80">{total}</span>
          <span className="text-gray-500">bilan(s) généré(s)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="inline-flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
              <span>Chargement…</span>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            Aucun bilan généré encore. Demandez à l&apos;Agent IA de générer un bilan pour une entreprise.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-purple-100/70 text-xs uppercase tracking-wider bg-purple-50/30">
                <th className="px-5 py-3.5 w-4">
                  <input
                    type="checkbox"
                    checked={reports.length > 0 && selectedIds.length === reports.length}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.length === reports.length ? [] : reports.map((r) => r._id)
                      )
                    }
                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-400"
                  />
                </th>
                <th className="px-5 py-3.5 font-semibold">Entreprise</th>
                <th className="px-5 py-3.5 font-semibold">Secteur</th>
                <th className="px-5 py-3.5 font-semibold">Demandé par</th>
                <th className="px-5 py-3.5 font-semibold">Localisation</th>
                <th className="px-5 py-3.5 font-semibold">Score</th>
                <th className="px-5 py-3.5 font-semibold">Généré le</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r._id}
                  className="border-b border-purple-50 last:border-0 hover:bg-gradient-to-r hover:from-purple-50/60 hover:to-fuchsia-50/30 cursor-pointer transition-colors duration-200"
                  onClick={() => router.push(`/rapports/${r._id}`)}
                >
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r._id)}
                      onChange={() => toggleSelect(r._id)}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-400"
                    />
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="ring-2 ring-purple-100 rounded-full transition-transform duration-200 group-hover:scale-105">
                        <CategoryIconCircle category={r.category} />
                      </div>
                      <span className="tracking-tight">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <CategoryBadge category={r.category} />
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {r.requestedBy?.userName || "Système"}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {r.address?.city} <span className="text-gray-400">({r.address?.postcode})</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${scoreColor(r.score)}`}>
                      {r.score}/100
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs">
                    {new Date(r.createdAt).toLocaleDateString("fr-BE")}
                  </td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => router.push(`/rapports/${r._id}`)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 hover:scale-110"
                        title="Voir le bilan"
                      >
                        <Eye size={15} />
                      </button>

                      {/* Affichage conditionnel de l'action de suppression */}
                      {canModify ? (
                        <button
                          onClick={() => handleDelete(r._id, r.name)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <span className="p-2 text-slate-300 cursor-not-allowed" title="Action non autorisée">
                          <Lock size={14} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <span className="text-sm text-gray-500">
          Page <span className="font-semibold text-purple-700">{page}</span> sur {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-purple-200/70 bg-white/70 backdrop-blur-sm rounded-xl text-sm text-purple-700 shadow-sm hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:hover:bg-white/70 transition-all duration-200"
          >
            ←
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 border border-purple-200/70 bg-white/70 backdrop-blur-sm rounded-xl text-sm text-purple-700 shadow-sm hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:hover:bg-white/70 transition-all duration-200"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
