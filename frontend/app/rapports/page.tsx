"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CategoryBadge, CategoryIconCircle } from "@/components/utils/categoryIcons";
import { Trash2, Eye } from "lucide-react";

interface Report {
  _id: string;
  prospect_id: string;
  name: string;
  category: string;
  address: { city?: string; postcode?: string };
  score: number;
  presence_digitale: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ReportsListPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const limit = 20;

  useEffect(() => {
    fetchReports();
  }, [page]);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/reports`, { params: { page, limit } });
      setReports(res.data.results || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error("Erreur chargement bilans:", error);
    } finally {
      setLoading(false);
    }
  }
   useEffect(() => {
    fetchReports();
  }, [page]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le bilan de "${name}" ?`)) return;
    try {
      await axios.delete(`${API_URL}/api/reports/${id}`);
      setReports((prev) => prev.filter((r) => r._id !== id));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error("Erreur suppression:", error);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Supprimer ${selectedIds.length} bilan(s) sélectionné(s) ?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => axios.delete(`${API_URL}/api/reports/${id}`)));
      setReports((prev) => prev.filter((r) => !selectedIds.includes(r._id)));
      setTotal((prev) => prev - selectedIds.length);
      setSelectedIds([]);
    } catch (error) {
      console.error("Erreur suppression en masse:", error);
    }
  }

  const scoreColor = (score: number) =>
    score >= 70 ? "bg-emerald-50 text-emerald-700" : score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports & Bilans</h1>
          <p className="text-sm text-gray-500">Historique de tous les bilans de prospection générés par l&apos;IA</p>
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-sm font-semibold bg-red-50 text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-100 transition"
          >
            <Trash2 size={16} /> Supprimer ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-border-color rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border-color text-sm text-gray-500">
          {total} bilan(s) généré(s)
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Aucun bilan généré encore. Demandez à l&apos;Agent IA de générer un bilan pour une entreprise.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border-color text-xs uppercase">
                <th className="px-5 py-3 w-4">
                  <input
                    type="checkbox"
                    checked={reports.length > 0 && selectedIds.length === reports.length}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.length === reports.length ? [] : reports.map((r) => r._id)
                      )
                    }
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-5 py-3 font-medium">Entreprise</th>
                <th className="px-5 py-3 font-medium">Secteur</th>
                <th className="px-5 py-3 font-medium">Localisation</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Présence digitale</th>
                <th className="px-5 py-3 font-medium">Généré le</th>
                <th className="px-5 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r._id}
                  className="border-b border-border-color last:border-0 hover:bg-content-bg cursor-pointer"
                  onClick={() => router.push(`/rapports/${r._id}`)}
                >
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r._id)}
                      onChange={() => toggleSelect(r._id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900 flex items-center gap-3">
                    <CategoryIconCircle category={r.category} />
                    {r.name}
                  </td>
                  <td className="px-5 py-3">
                    <CategoryBadge category={r.category} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {r.address?.city} ({r.address?.postcode})
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${scoreColor(r.score)}`}>
                      {r.score}/100
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{r.presence_digitale}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(r.createdAt).toLocaleDateString("fr-BE")}
                  </td>
                  <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => router.push(`/rapports/${r._id}`)}
                        className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent-light rounded-lg transition"
                        title="Voir le bilan"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(r._id, r.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">
          Page {page} sur {Math.max(1, Math.ceil(total / limit))}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-border-color rounded-lg text-sm disabled:opacity-40"
          >
            ←
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1.5 border border-border-color rounded-lg text-sm disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}