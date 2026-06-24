"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import KpiCard from "@/components/pages/KpiCard";

interface Prospect {
  _id: string;
  name: string;
  category: string;
  address: {
    city: string | null;
    postcode: string | null;
  };
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string;
  score: number | null;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 50;

  async function fetchProspects() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/prospects`, {
        params: { page, limit },
      });
      setProspects(res.data.results);
      setTotal(res.data.total);
    } catch (error) {
      console.error("Erreur chargement prospects:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  async function fetchProspects() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/prospects`, {
        params: { page, limit },
      });
      setProspects(res.data.results);
      setTotal(res.data.total);
    } catch (error) {
      console.error("Erreur chargement prospects:", error);
    } finally {
      setLoading(false);
    }
  }

  fetchProspects();
}, [page]);

  const emailsCount = prospects.filter((p) => p.email).length;
  const websitesCount = prospects.filter((p) => p.website).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospects</h1>
          <p className="text-sm text-gray-500">
            Gérez et consultez l&apos;ensemble de vos entreprises prospects
          </p>
        </div>
        <button className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
          + Ajouter un prospect
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard icon="🏢" label="Total prospects" value={total} color="accent" />
        <KpiCard icon="📧" label="Emails trouvés" value={emailsCount} color="green" />
        <KpiCard icon="🌐" label="Sites web trouvés" value={websitesCount} color="blue" />
        <KpiCard icon="⭐" label="Score moyen" value="—" color="orange" />
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un prospect, une ville, un secteur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-border-color bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-border-color rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border-color text-sm text-gray-500">
          {total} prospects trouvés
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border-color">
                <th className="px-5 py-3 font-medium">Entreprise</th>
                <th className="px-5 py-3 font-medium">Secteur</th>
                <th className="px-5 py-3 font-medium">Localisation</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-border-color last:border-0 hover:bg-content-bg"
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3">
                    <span className="bg-accent-light text-accent px-2 py-1 rounded-md text-xs">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.address?.city || p.address?.postcode || "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    <div>{p.phone || "—"}</div>
                    <div className="text-xs text-gray-400">{p.email || ""}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="bg-blue/10 text-blue px-2 py-1 rounded-md text-xs uppercase">
                      {p.source}
                    </span>
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
          Page {page} sur {Math.ceil(total / limit)}
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