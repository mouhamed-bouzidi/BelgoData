"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Building2,
  Mail,
  Globe,
  Star,
  Target,
  Lock,
  Search,
  RotateCcw,
  Trash2,
  Plus,
  X,
  Phone,
  Flame,
  CloudSun,
  Snowflake,
  Columns3,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { CategoryBadge, CategoryIconCircle } from "@/components/utils/categoryIcons";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

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
  temperature?: "chaud" | "tiede" | "froid";
  createdAt?: string;
  createdBy?: { userName?: string };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Icône de température unifiée (style Lucide, mêmes couleurs que les badges de score)
function TemperatureIcon({ temperature }: { temperature?: Prospect["temperature"] }) {
  if (temperature === "chaud") return <Flame size={13} className="text-rose-500 shrink-0" />;
  if (temperature === "tiede") return <CloudSun size={13} className="text-amber-500 shrink-0" />;
  if (temperature === "froid") return <Snowflake size={13} className="text-blue-500 shrink-0" />;
  return null;
}

export default function ProspectsPage() {
  const { user, token, loading } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sessions, setSessions] = useState<{ sessionId: string; category: string; postalCode: string; totalFound: number; createdAt: string }[]>([]);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await axios.get(`${API_URL}/api/scraping/sessions`);
        setSessions(res.data.slice(0, 3));
      } catch (error) {
        console.error("Erreur sessions:", error);
      }
    }
    fetchSessions();
  }, []);

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

  const [activeFilters, setActiveFilters] = useState({
    search: "",
    source: "Toutes",
    sector: "Tous les secteurs",
    city: "Toutes",
    email: "Toutes",
    score: "",
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

  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("belgodata_token") || localStorage.getItem("token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  const fetchData = useCallback(async () => {
    const config = getAuthConfig();
    const authHeader = (config.headers as Record<string, string> | undefined)?.Authorization;

    if (!authHeader) {
      setProspects([]);
      setTotal(0);
      setStats({
        total: 0,
        emailsCount: 0,
        websitesCount: 0,
        avgScore: 0,
        hotLeads: 0,
        trends: { total: 0, emails: 0, websites: 0, avgScore: 0, hotLeads: 0 },
      });
      return;
    }

    try {
      let url = `${API_URL}/api/prospects?page=${page}&limit=${limit}`;

      if (activeFilters.search) url += `&search=${encodeURIComponent(activeFilters.search)}`;
      if (activeFilters.city !== "Toutes") url += `&postal_code=${activeFilters.city}`;
      if (activeFilters.sector !== "Tous les secteurs") url += `&category=${encodeURIComponent(activeFilters.sector)}`;
      if (activeFilters.source !== "Toutes") url += `&source=${activeFilters.source}`;
      if (activeFilters.email !== "Toutes") url += `&email=${encodeURIComponent(activeFilters.email)}`;
      if (activeFilters.score) url += `&score_min=${activeFilters.score}`;

      const [prospectsRes, statsRes] = await Promise.all([
        axios.get(url, config),
        axios.get(`${API_URL}/api/prospects/stats`, config),
      ]);

      setProspects(prospectsRes.data.results || []);
      setTotal(prospectsRes.data.total || 0);
      setStats(
        statsRes.data || {
          total: 0,
          emailsCount: 0,
          websitesCount: 0,
          avgScore: 0,
          hotLeads: 0,
          trends: { total: 0, emails: 0, websites: 0, avgScore: 0, hotLeads: 0 },
        }
      );
    } catch (error) {
      console.error("Erreur lors de la récupération des prospects :", error);
    }
  }, [page, limit, activeFilters, getAuthConfig]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      fetchData();
    }
  }, [fetchData, mounted, loading]);

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
      score: minScore,
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
      await axios.post(
        `${API_URL}/api/prospects`,
        {
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
        },
        getAuthConfig()
      );

      setShowAddModal(false);
      setNewProspect({ name: "", category: "Autre", street: "", city: "", postcode: "", phone: "", email: "", website: "" });
      await fetchData();
    } catch (error) {
      console.error("Erreur ajout prospect :", error);
      alert("Erreur lors de l'ajout du prospect.");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
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
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const renderTrend = (value: number) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const color = isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-500";
    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

    return (
      <p className={`flex items-center gap-1 text-[11px] ${color} font-semibold mt-0.5`}>
        <TrendIcon size={12} className="shrink-0" />
        {Math.abs(value)}% <span className="text-slate-400 font-normal">vs période précédente</span>
      </p>
    );
  };

  const scoreClass = (score?: number) => {
    if (score === null || score === undefined) return "bg-slate-50 text-slate-400";
    if (score >= 80) return "bg-emerald-50 text-emerald-700";
    if (score >= 70) return "bg-blue-50 text-blue-700";
    return "bg-amber-50 text-amber-700";
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-[#f8fafc] min-h-screen text-[#1e293b]">
      {/* HEADER SECTION */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-purple-100/70 text-purple-700 text-xs font-medium ring-1 ring-purple-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
            Prospection
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-800 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent tracking-tight">
            Prospects
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
            Liste des prospects collectés et suivis par votre équipe.
          </p>
        </div>

        {mounted && (
          <div className="shrink-0 flex gap-2">
            <Link
              href="/prospects/archives"
              className="w-full md:w-auto justify-center bg-slate-600 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
            >
              <Trash2 size={16} /> Archives
            </Link>
            {canModify ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full md:w-auto justify-center bg-[#5046e5] hover:bg-[#4338ca] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                <Plus size={16} /> Ajouter un prospect
              </button>
            ) : (
              <div className="w-fit bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                <Lock size={14} className="text-amber-600 shrink-0" />
                <span>Consultation seule</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STATS CARDS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6 sm:mb-8">
        {[
          { icon: <Building2 size={20} />, wrap: "bg-indigo-50 text-indigo-600", label: "Total prospects", value: stats.total, trend: stats.trends.total },
          { icon: <Mail size={20} />, wrap: "bg-emerald-50 text-emerald-600", label: "Emails trouvés", value: stats.emailsCount, trend: stats.trends.emails },
          { icon: <Globe size={20} />, wrap: "bg-blue-50 text-blue-600", label: "Sites web trouvés", value: stats.websitesCount, trend: stats.trends.websites },
          { icon: <Star size={20} />, wrap: "bg-amber-50 text-amber-500", label: "Score moyen", value: stats.avgScore, suffix: " /100", trend: stats.trends.avgScore },
          { icon: <Target size={20} />, wrap: "bg-rose-50 text-rose-500", label: "Leads chauds", value: stats.hotLeads, trend: stats.trends.hotLeads },
        ].map((card) => (
          <div key={card.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl shrink-0 ${card.wrap}`}>{card.icon}</div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 font-medium truncate">{card.label}</p>
              <p className="text-lg font-bold text-slate-800">
                {card.value}
                {card.suffix && <span className="text-[11px] text-slate-400">{card.suffix}</span>}
              </p>
              {renderTrend(card.trend)}
            </div>
          </div>
        ))}
      </div>

      {/* BARRE DE FILTRES */}
      <form onSubmit={handleSearch} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Rechercher un prospect, une ville, un secteur..."
            value={searchGlobal}
            onChange={(e) => setSearchGlobal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:items-end">
          <div className="min-w-0">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option>Toutes</option>
              <option value="osm">OSM</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Secteur</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option>Tous les secteurs</option>
              <option>Restauration &amp; Café</option>
              <option>Alimentation &amp; Boulangerie</option>
              <option>Industrie &amp; Production</option>
              <option>Artisanat &amp; Construction</option>
              <option>Commerce &amp; Retail</option>
              <option>Services aux Entreprises</option>
              <option>Finance &amp; Juridique</option>
              <option>Immobilier</option>
              <option>Tech &amp; Télécom</option>
              <option>Administration &amp; Secteur Public</option>
              <option>Asbl &amp; ONG</option>
              <option>Éducation &amp; Recherche</option>
              <option>Santé</option>
              <option>Culture &amp; Loisirs</option>
              <option>Hôtellerie &amp; Tourisme</option>
              <option>Transport &amp; Logistique</option>
              <option>Autre</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Province / Ville</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option>Toutes</option>
              <option value="1000">Bruxelles (1000)</option>
              <option value="2000">Anvers (2000)</option>
              <option value="3000">Louvain (3000)</option>
              <option value="4000">Liège (4000)</option>
              <option value="5000">Namur (5000)</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Email</label>
            <select
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option>Toutes</option>
              <option>Disponible</option>
              <option>Non disponible</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Score min.</label>
            <input
              type="number"
              placeholder="Min."
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm"
            >
              Filtrer
            </button>
            <button
              type="button"
              onClick={handleReset}
              aria-label="Réinitialiser les filtres"
              className="shrink-0 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition flex items-center justify-center"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </form>

      {/* SESSIONS DE SCRAPING RÉCENTES */}
      {sessions.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Sessions de scraping récentes</h2>
            <a href="/prospects" className="text-xs sm:text-sm text-accent">
              Voir tous →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {sessions.map((s) => (
              <a
                key={s.sessionId}
                href={`/scraping/${s.sessionId}`}
                className="bg-white border border-slate-100 rounded-xl p-4 hover:border-accent/30 hover:shadow-sm transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold bg-accent-light text-accent px-2 py-0.5 rounded truncate max-w-full">
                    {s.category}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(s.createdAt).toLocaleDateString("fr-BE")}
                  </span>
                </div>
                <div className="font-semibold text-gray-900">{s.postalCode}</div>
                <div className="text-sm text-gray-500">{s.totalFound} prospects trouvés</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* CONTROLE DES ACTIONS EN MASSE */}
      {mounted && selectedIds.length > 0 && canModify && (
        <button
          onClick={handleBulkDelete}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 px-3 py-2 rounded-xl hover:bg-red-100 transition mb-3 w-full sm:w-auto"
        >
          <Trash2 size={14} /> Supprimer ({selectedIds.length})
        </button>
      )}

      {/* TABLE / LISTE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border-b border-slate-100">
          <p className="text-xs font-bold text-slate-700">{total} prospects trouvés</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-50">
              <Columns3 size={14} /> Colonnes
            </button>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs font-semibold border border-slate-200 px-2 py-1.5 rounded-xl text-slate-600"
            >
              <option value={10}>10 par page</option>
              <option value={50}>50 par page</option>
            </select>
          </div>
        </div>

        {/* VUE MOBILE / TABLETTE : cartes */}
        <ul className="divide-y divide-slate-100 lg:hidden">
          {prospects.map((p) => (
            <li key={p._id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                {mounted && canModify && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p._id!)}
                    onChange={() => p._id && toggleSelect(p._id)}
                    className="mt-1 shrink-0 rounded border-slate-300"
                    aria-label={`Sélectionner ${p.name}`}
                  />
                )}
                <div className="shrink-0">
                  <CategoryIconCircle category={p.category} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm break-words">{p.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {p.address?.city || "Bruxelles"} ({p.address?.postcode || "1000"}) · {p.address?.province || "Belgique"}
                  </p>
                </div>
                <span className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-extrabold ${scoreClass(p.score)}`}>
                  {p.score !== null && p.score !== undefined ? `${p.score}/100` : "—"}
                  <TemperatureIcon temperature={p.temperature} />
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={p.category} />
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                    p.source === "linkedin"
                      ? "bg-blue-50 border-blue-200 text-blue-600"
                      : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}
                >
                  {p.createdBy?.userName ? p.createdBy.userName : p.source ? p.source.toUpperCase() : "OSM"}
                </span>
              </div>

              <div className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="hover:text-indigo-600 flex items-center gap-1.5 break-all">
                    <Phone size={12} className="shrink-0 text-slate-400" /> {p.phone}
                  </a>
                )}
                {p.email ? (
                  <a href={`mailto:${p.email}`} className="text-slate-400 hover:text-indigo-600 flex items-center gap-1.5 break-all">
                    <Mail size={12} className="shrink-0" /> {p.email}
                  </a>
                ) : (
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Mail size={12} className="shrink-0" /> -
                  </span>
                )}
                {p.website && (
                  <a
                    href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline flex items-center gap-1.5 text-[11px]"
                  >
                    <Globe size={12} className="shrink-0" /> Site web
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-400">{formatDate(p.createdAt)}</span>
                {mounted && canModify && (
                  <button
                    onClick={() => handleDelete(p._id!, p.name!)}
                    className="text-slate-400 hover:text-red-600 font-bold px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200/60 rounded-lg transition text-xs flex items-center justify-center"
                    title="Supprimer ce prospect"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* VUE DESKTOP : tableau */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[960px] text-left border-collapse">
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
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="p-4">Entreprise</th>
                <th className="p-4">Secteur</th>
                <th className="p-4">Localisation</th>
                <th className="p-4">Contact</th>
                <th className="p-4 xl:table-cell hidden">Créé par</th>
                <th className="p-4">Score IA</th>
                <th className="p-4 xl:table-cell hidden">Ajouté le</th>
                {mounted && canModify && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {prospects.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/80 transition text-xs text-[#334155]">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p._id!)}
                      onChange={() => p._id && toggleSelect(p._id)}
                      className="rounded border-slate-300"
                      aria-label={`Sélectionner ${p.name}`}
                    />
                  </td>

                  <td className="p-4 font-bold text-slate-800">
                    <div className="flex items-center gap-3">
                      <CategoryIconCircle category={p.category} />
                      <span className="min-w-0 break-words">{p.name}</span>
                    </div>
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
                    <div className="flex flex-col gap-0.5 max-w-[220px]">
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="hover:text-indigo-600 flex items-center gap-1.5">
                          <Phone size={12} className="shrink-0 text-slate-400" /> {p.phone}
                        </a>
                      )}
                      {p.email ? (
                        <a href={`mailto:${p.email}`} className="text-slate-400 hover:text-indigo-600 flex items-center gap-1.5 truncate">
                          <Mail size={12} className="shrink-0" /> {p.email}
                        </a>
                      ) : (
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <Mail size={12} className="shrink-0" /> -
                        </span>
                      )}
                      {p.website && (
                        <a
                          href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline flex items-center gap-1.5 text-[11px]"
                        >
                          <Globe size={12} className="shrink-0" /> Site web
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="p-4 xl:table-cell hidden">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold border whitespace-nowrap ${
                        p.source === "linkedin"
                          ? "bg-blue-50 border-blue-200 text-blue-600"
                          : "bg-emerald-50 border-emerald-200 text-emerald-600"
                      }`}
                    >
                      {p.createdBy?.userName ? p.createdBy.userName : p.source ? p.source.toUpperCase() : "OSM"}
                    </span>
                  </td>

                  <td className="p-4 font-bold whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-extrabold ${scoreClass(p.score)}`}>
                      {p.score !== null && p.score !== undefined ? `${p.score}/100` : "—"}
                      <TemperatureIcon temperature={p.temperature} />
                    </span>
                  </td>

                  <td className="p-4 text-[11px] font-medium text-slate-400 xl:table-cell hidden">
                    {formatDate(p.createdAt)}
                  </td>

                  {mounted && canModify && (
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(p._id!, p.name!)}
                        className="text-slate-400 hover:text-red-600 font-bold px-2 py-1 bg-slate-50 hover:bg-red-50 border border-slate-200/60 rounded-lg transition text-xs inline-flex items-center justify-center"
                        title="Supprimer ce prospect"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 font-semibold">
          <p className="text-center sm:text-left">
            Affichage de 1 à {prospects.length} sur {total} prospects
          </p>
          <div className="flex items-center justify-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center">
              <ChevronsLeft size={14} />
            </button>
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(p - 1, 1))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center">
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">{page}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center">
              <ChevronRight size={14} />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center">
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL AJOUT PROSPECT */}
      {showAddModal && mounted && canModify && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Ajouter un prospect manuellement</h2>
              <button onClick={() => setShowAddModal(false)} className="shrink-0 text-slate-400 hover:text-slate-700 p-1" aria-label="Fermer">
                <X size={18} />
              </button>
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
                  <option>Restauration &amp; Café</option>
                  <option>Alimentation &amp; Boulangerie</option>
                  <option>Industrie &amp; Production</option>
                  <option>Artisanat &amp; Construction</option>
                  <option>Commerce &amp; Retail</option>
                  <option>Services aux Entreprises</option>
                  <option>Finance &amp; Juridique</option>
                  <option>Immobilier</option>
                  <option>Tech &amp; Télécom</option>
                  <option>Administration &amp; Secteur Public</option>
                  <option>Asbl &amp; ONG</option>
                  <option>Éducation &amp; Recherche</option>
                  <option>Santé</option>
                  <option>Culture &amp; Loisirs</option>
                  <option>Hôtellerie &amp; Tourisme</option>
                  <option>Transport &amp; Logistique</option>
                  <option>Autre</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    inputMode="numeric"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Téléphone</label>
                  <input
                    type="tel"
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

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
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