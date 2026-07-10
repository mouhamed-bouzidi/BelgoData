"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { CategoryBadge, CategoryIconCircle } from "@/components/utils/categoryIcons";

interface Prospect {
  _id: string;
  name: string;
  category: string;
  address: { city?: string; postcode?: string; province?: string };
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string;
  score: number | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ScrapingSessionPage() {
  const params = useParams();
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    async function fetchProspects() {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/api/scraping/sessions/${params.sessionId}/prospects`,
          { params: { page, limit } }
        );
        setProspects(res.data.results || []);
        setTotal(res.data.total || 0);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProspects();
  }, [params.sessionId, page]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span>Agent IA</span> › <span>Résultats scraping</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Prospects de cette session
          </h1>
          <p className="text-sm text-gray-500">{total} prospects trouvés</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2.5 border border-border-color rounded-lg text-sm font-medium text-gray-700 hover:bg-content-bg"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <a
            href="/prospects"
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover"
          >
            Voir tous les prospects →
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-border-color rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border-color text-xs uppercase">
                <th className="px-5 py-3 font-medium">Entreprise</th>
                <th className="px-5 py-3 font-medium">Secteur</th>
                <th className="px-5 py-3 font-medium">Localisation</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-border-color last:border-0 hover:bg-content-bg"
                >
                  <td className="px-5 py-3 font-medium text-gray-900 flex items-center gap-3">
                    <CategoryIconCircle category={p.category} />
                    {p.name}
                  </td>
                  <td className="px-5 py-3">
                    <CategoryBadge category={p.category} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    <div>{p.address?.city} ({p.address?.postcode})</div>
                    <div className="text-xs text-gray-400">{p.address?.province}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.phone && <div className="text-xs">📞 {p.phone}</div>}
                    {p.email && <div className="text-xs">✉️ {p.email}</div>}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline">
                        🌐 Site web
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {p.score !== null ? (
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        p.score >= 70 ? "bg-emerald-50 text-emerald-700" :
                        p.score >= 50 ? "bg-amber-50 text-amber-700" :
                        "bg-slate-50 text-slate-400"
                      }`}>
                        {p.score}/100
                      </span>
                    ) : <span className="text-gray-400">—</span>}
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
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-border-color rounded-lg text-sm disabled:opacity-40"
          >←</button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1.5 border border-border-color rounded-lg text-sm disabled:opacity-40"
          >→</button>
        </div>
      </div>
    </div>
  );
}