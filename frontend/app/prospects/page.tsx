"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Building2, Mail, Globe, Star, Target, Lock } from "lucide-react";
import { CategoryBadge, CategoryIconCircle } from "@/components/utils/categoryIcons";
import { useAuth } from "@/context/AuthContext";

type ProspectAddress = {
  city?: string;
  postcode?: string;
  province?: string;
};

type Prospect = {
  _id?: string;
  name?: string;
  category?: string;
  address?: ProspectAddress;
  phone?: string;
  email?: string;
  website?: string;
  source?: string;
  score?: number;
  createdAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ProspectsPage() {
  const { user, token } = useAuth(); 
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Filtres de recherche
  const [searchGlobal, setSearchGlobal] = useState("");
  const [source, setSource] = useState("Toutes");
  const [sector, setSector] = useState("Tous les secteurs");
  const [city, setCity] = useState("Toutes");
  const [emailFilter, setEmailFilter] = useState("Toutes");
  const [minScore, setMinScore] = useState("");

  // Sécurité d'hydratation
  const [mounted, setMounted] = useState(false);

  // Droits de modification basés sur le rôle
  const canModify = user?.role === "Administrateur" || user?.role === "Commercial";

  // Ajout nouveau prospect manuel
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProspect, setNewProspect] = useState({
    name: "",
    category: "Autre",
    street: "",
    city: "",
    postcode: "",
    phone: "",
    email: "",
    website: "",
  });

  // États actifs transmis à l'API
  const [activeFilters, setActiveFilters] = useState({
    search: "",
    source: "Toutes",
    sector: "Tous les secteurs",
    city: "Toutes",
    email: "Toutes",
    score: ""
  });

  const [stats, setStats] = useState({
    total: 0,
    emailsCount: 0,
    websitesCount: 0,
    avgScore: 0,
    hotLeads: 0,
    trends: {
      total: 0,
      emails: 0,
      websites: 0,
      avgScore: 0,
      hotLeads: 0,
    },
  });

  // Configuration des headers d'authentification Bearer JWT
  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  const fetchData = useCallback(async () => {
    try {
      let url = `${API_URL}/api/prospects?page=${page}&limit=${limit}`;

      if (activeFilters.search) url += `&search=${encodeURIComponent(activeFilters.search)}`;
      if (activeFilters.city !== "Toutes") url += `&postal_code=${activeFilters.city}`;
      if (activeFilters.sector !== "Tous les secteurs") url += `&category=${encodeURIComponent(activeFilters.sector)}`;
      if (activeFilters.source !== "Toutes") url += `&source=${activeFilters.source}`;
      if (activeFilters.email !== "Toutes") url += `&email=${encodeURIComponent(activeFilters.email)}`;
      if (activeFilters.score) url += `&score_min=${activeFilters.score}`;

      const config = getAuthConfig();

      const [prospectsRes, statsRes] = await Promise.all([
        axios.get(url, config),
        axios.get(`${API_URL}/api/prospects/stats`, config),
      ]);

      setProspects(prospectsRes.data.results || []);
      setTotal(prospectsRes.data.total || 0);
      setStats(statsRes.data || {
        total: 0,
        emailsCount: 0,
        websitesCount: 0,
        avgScore: 0,
        hotLeads: 0,
        trends: { total: 0, emails: 0, websites: 0, avgScore: 0, hotLeads: 0 },
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des prospects :", error);
    }
  }, [page, limit, activeFilters, getAuthConfig]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [fetchData, mounted]);

  async function handleDelete(id: string, name: string) {
    if (!canModify) return;
    if (!confirm(`Supprimer "${name}" de la base de prospects ?`)) return;

    try {
      await axios.delete(`${API_URL}/api/prospects/${id}`, getAuthConfig());
      await fetchData();
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      alert("Erreur lors de la suppression du prospect.");
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveFilters({
      search: searchGlobal,
      source: source,
      sector: sector,
      city: city,
      email: emailFilter,
      score: minScore
    });
  };

  const handleReset = () => {
    setSearchGlobal("");
    setSource("Toutes");
    setSector("Tous les secteurs");
    setCity("Toutes");
    setEmailFilter("Toutes");
    setMinScore("");
    setActiveFilters({ search: "", source: "Toutes", sector: "Tous les secteurs", city: "Toutes", email: "Toutes", score: "" });
    setPage(1);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function handleAddProspect(e: React.FormEvent) {
    e.preventDefault();
    if (!canModify) return;

    try {
      await axios.post(`${API_URL}/api/prospects`, {
        name: newProspect.name,
        category: newProspect.category,
        address: {
          street: newProspect.street || null,
          city: newProspect.city || null,
          postcode: newProspect.postcode || null,
        },
        phone: newProspect.phone || null,
        email: newProspect.email || null,
        website: newProspect.website || null,
      }, getAuthConfig());
      
      setShowAddModal(false);
      setNewProspect({ name: "", category: "Autre", street: "", city: "", postcode: "", phone: "", email: "", website: "" });
      await fetchData();
    } catch (error) {
      console.error("Erreur ajout prospect :", error);
      alert("Erreur lors de l'ajout du prospect.");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleBulkDelete() {
    if (!canModify || selectedIds.length === 0) return;
    if (!confirm(`Supprimer ${selectedIds.length} prospect(s) sélectionné(s) ?`)) return;

    try {
      const config = getAuthConfig();
      await Promise.all(selectedIds.map((id) => axios.delete(`${API_URL}/api/prospects/${id}`, config)));
      await fetchData();
      setSelectedIds([]);
    } catch (error) {
      console.error("Erreur suppression en masse :", error);
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "12/06/2025\n10:32";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const renderTrend = (value: number) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const color = isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-500";
    const arrow = isPositive ? "↗" : isNegative ? "↘" : "→";

    return (
      <p className={`text-[11px] ${color} font-semibold mt-0.5`}>
        {arrow} {Math.abs(value)}% <span className="text-slate-400 font-normal">vs période précédente</span>
      </p>
    );
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen text-[#1e293b]">
      {/* HEADER SECTION - Protégée contre les conflits d'hydratation SSR */}
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Prospects</h1>
        <div className="flex gap-3">
          {mounted && (
            canModify ? (
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-[#5046e5] hover:bg-[#4338ca] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                <span>+</span> Ajouter un prospect
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                <Lock size={14} className="text-amber-600" />
                <span>Consultation seule</span>
              </div>
            )
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-8">Gérez et consultez l&apos;ensemble de vos entreprises prospects</p>

      {/* STATS CARDS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total prospects</p>
            <p className="text-xl font-bold text-slate-800">{stats.total}</p>
            {renderTrend(stats.trends.total)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Mail size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Emails trouvés</p>
            <p className="text-xl font-bold text-slate-800">{stats.emailsCount}</p>
            {renderTrend(stats.trends.emails)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Globe size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Sites web trouvés</p>
            <p className="text-xl font-bold text-slate-800">{stats.websitesCount}</p>
            {renderTrend(stats.trends.websites)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
            <Star size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Score moyen</p>
            <p className="text-xl font-bold text-slate-800">{stats.avgScore}<span className="text-xs text-slate-400"> /100</span></p>
            {renderTrend(stats.trends.avgScore)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
            <Target size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Leads chauds</p>
            <p className="text-xl font-bold text-slate-800">{stats.hotLeads}</p>
            {renderTrend(stats.trends.hotLeads)}
          </div>
        </div>
      </div>

      {/* BARRE DE FILTRES */}
      <form onSubmit={handleSearch} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un prospect, une ville, un secteur..."
            value={searchGlobal}
            onChange={(e) => setSearchGlobal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-end gap-4 flex-wrap md:flex-nowrap">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option>Toutes</option>
              <option value="osm">OSM</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Secteur</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option>Tous les secteurs</option>
              <option>Restauration & Café</option>
              <option>Alimentation & Boulangerie</option>
              <option>Administration & Secteur Public</option>
              <option>Services aux Entreprises</option>
              <option>Finance & Juridique</option>
              <option>Immobilier</option>
              <option>Tech & Télécom</option>
              <option>Asbl & ONG</option>
              <option>Éducation & Recherche</option>
              <option>Santé</option>
              <option>Autre</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Province / Ville</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option>Toutes</option>
              <option value="1000">Bruxelles (1000)</option>
              <option value="2000">Anvers (2000)</option>
              <option value="3000">Louvain (3000)</option>
              <option value="4000">Liège (4000)</option>
              <option value="5000">Namur (5000)</option>
            </select>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Email</label>
            <select
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option>Toutes</option>
              <option>Disponible</option>
              <option>Non disponible</option>
            </select>
          </div>

          <div className="flex-1 min-w-[100px]">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Score min.</label>
            <input
              type="number"
              placeholder="Min."
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            />
          </div>

          <div className="flex gap-2 min-w-[120px]">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm"
            >
              Filtrer
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition"
            >
              🔄
            </button>
          </div>
        </div>
      </form>

      {/* CONTROLE DES ACTIONS EN MASSE */}
      {mounted && selectedIds.length > 0 && canModify && (
        <button
          onClick={handleBulkDelete}
          className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-100 transition mb-3 block"
        >
          🗑️ Supprimer ({selectedIds.length})
        </button>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-white border-b border-slate-100">
          <p className="text-xs font-bold text-slate-700">{total} prospects trouvés</p>
          <div className="flex items-center gap-3">
            <button className="text-xs font-semibold border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-50">📊 Colonnes</button>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="text-xs font-semibold border border-slate-200 px-2 py-1.5 rounded-xl text-slate-600">
              <option value={10}>10 par page</option>
              <option value={50}>50 par page</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-4">
                  <input
                    type="checkbox"
                    checked={prospects.length > 0 && selectedIds.length === prospects.length}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.length === prospects.length
                          ? []
                          : prospects.map((prospect) => prospect._id!).filter(Boolean)
                      )
                    }
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="p-4">Entreprise</th>
                <th className="p-4">Secteur</th>
                <th className="p-4">Localisation</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Source</th>
                <th className="p-4">Score IA</th>
                <th className="p-4">Ajouté le</th>
                {mounted && canModify && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {prospects.map((p) => {
                const hasScore = p.score !== null && p.score !== undefined;
                const scoreColor = !hasScore
                  ? "bg-slate-50 text-slate-400"
                  : p.score! >= 80
                  ? "bg-emerald-50 text-emerald-700"
                  : p.score! >= 70
                  ? "bg-blue-50 text-blue-700"
                  : "bg-amber-50 text-amber-700";

                return (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition text-xs text-[#334155]">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p._id!)}
                        onChange={() => p._id && toggleSelect(p._id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                      <CategoryIconCircle category={p.category} />
                      {p.name}
                    </td>

                    <td className="p-4">
                      <CategoryBadge category={p.category} />
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-700">
                        {p.address?.city || "Bruxelles"} ({p.address?.postcode || "1000"})
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {p.address?.province || "Belgique"}
                      </div>
                    </td>

                    <td className="p-4 font-medium text-slate-500">
                      <div className="flex flex-col gap-0.5">
                        {p.phone && <a href={`tel:${p.phone}`} className="hover:text-indigo-600 flex items-center gap-1">📞 {p.phone}</a>}
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="text-slate-400 hover:text-indigo-600 flex items-center gap-1">✉ {p.email}</a>
                        ) : (
                          <span className="text-slate-300">✉ -</span>
                        )}
                        {p.website && (
                          <a 
                            href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-emerald-600 hover:underline flex items-center gap-1 text-[11px]"
                          >
                            🌐 Site web
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${p.source === 'linkedin' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                        {p.source ? p.source.toUpperCase() : "OSM"}
                      </span>
                    </td>

                    <td className="p-4 font-bold">
                      <span className={`px-2 py-1 rounded-md text-[11px] font-extrabold ${scoreColor}`}>
                        {hasScore ? `${p.score}/100` : "—"}
                      </span>
                    </td>

                    <td className="p-4 text-[11px] font-medium text-slate-400 whitespace-pre-line">
                      {formatDate(p.createdAt)}
                    </td>

                    {mounted && canModify && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(p._id!, p.name!)}
                          className="text-slate-400 hover:text-red-600 font-bold px-2 py-1 bg-slate-50 hover:bg-red-50 border border-slate-200/60 rounded-lg transition text-xs"
                          title="Supprimer ce prospect"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-semibold">
          <p>Affichage de 1 à {prospects.length} sur {total} prospects</p>
          <div className="flex gap-1 items-center">
            <button disabled={page === 1} onClick={() => setPage(1)} className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30">«</button>
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(p - 1, 1))} className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30">‹</button>
            <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">{page}</span>
            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30">›</button>
            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(Math.ceil(total / limit))} className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {/* MODAL AJOUT PROSPECT */}
      {showAddModal && mounted && canModify && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Ajouter un prospect manuellement</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAddProspect} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Nom de l&apos;entreprise *</label>
                <input
                  required
                  type="text"
                  value={newProspect.name}
                  onChange={(e) => setNewProspect({ ...newProspect, name: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Secteur</label>
                <select
                  value={newProspect.category}
                  onChange={(e) => setNewProspect({ ...newProspect, category: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                >
                  <option>Restauration & Café</option>
                  <option>Alimentation & Boulangerie</option>
                  <option>Administration & Secteur Public</option>
                  <option>Services aux Entreprises</option>
                  <option>Finance & Juridique</option>
                  <option>Immobilier</option>
                  <option>Tech & Télécom</option>
                  <option>Asbl & ONG</option>
                  <option>Éducation & Recherche</option>
                  <option>Santé</option>
                  <option>Autre</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Rue</label>
                  <input
                    type="text"
                    value={newProspect.street}
                    onChange={(e) => setNewProspect({ ...newProspect, street: e.target.value })}
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Code postal</label>
                  <input
                    type="text"
                    value={newProspect.postcode}
                    onChange={(e) => setNewProspect({ ...newProspect, postcode: e.target.value })}
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Ville</label>
                <input
                  type="text"
                  value={newProspect.city}
                  onChange={(e) => setNewProspect({ ...newProspect, city: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Téléphone</label>
                <input
                  type="text"
                  value={newProspect.phone}
                  onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Email</label>
                <input
                  type="email"
                  value={newProspect.email}
                  onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Site web</label>
                <input
                  type="text"
                  value={newProspect.website}
                  onChange={(e) => setNewProspect({ ...newProspect, website: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}