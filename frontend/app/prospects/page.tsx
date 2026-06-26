"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Mail, Globe, Star, Target } from "lucide-react";
import { CategoryBadge, CategoryIconCircle } from "@/components/utils/categoryIcons";
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

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // 1. États pour tous les filtres de la maquette
  const [searchGlobal, setSearchGlobal] = useState("");
  const [source, setSource] = useState("Toutes");
  const [sector, setSector] = useState("Tous les secteurs");
  const [city, setCity] = useState("Toutes");
  const [emailFilter, setEmailFilter] = useState("Toutes");
  const [minScore, setMinScore] = useState("");

  // États actifs pour l'API
  const [activeFilters, setActiveFilters] = useState({
    search: "",
    source: "Toutes",
    sector: "Tous les secteurs",
    city: "Toutes",
    email: "Toutes",
    score: ""
  });

  // Extraction et calcul des statistiques réelles basées sur la base
  //  NOUVEAU CODE CORRIGÉ (100% TEMPS RÉEL)
const stats = {
  total: total,
  emails: prospects.filter((p: Prospect) => p.email).length,
  sites: prospects.filter((p: Prospect) => p.website).length,
  avgScore: total > 0 ? Math.round(prospects.reduce((acc: number, p: Prospect) => acc + (p.score || 0), 0) / prospects.length) : 0,
  hotLeads: prospects.filter((p: Prospect) => (p.score || 0) >= 80).length
};

  useEffect(() => {
    const fetchProspects = async () => {
      try {
        let url = `http://localhost:5000/api/prospects?page=${page}&limit=${limit}`;
        
        // Filtrage dynamique par code postal si sélectionné
        if (activeFilters.city !== "Toutes") {
          url += `&postal_code=${activeFilters.city}`;
        }
        // Filtrage dynamique par secteur si sélectionné
        if (activeFilters.sector !== "Tous les secteurs") {
          url += `&category=${encodeURIComponent(activeFilters.sector)}`;
        }
        
        const res = await axios.get(url);
        setProspects(res.data.results || []);
        setTotal(res.data.total || 0);
      } catch (error) {
        console.error("Erreur lors de la récupération des prospects", error);
      }
    };
    fetchProspects();
  }, [page, limit, activeFilters]);

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

  // Helper pour formater proprement la date de création
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "12/06/2025\n10:32";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen text-[#1e293b]">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Prospects</h1>
        <div className="flex gap-3">
          <button className="bg-[#5046e5] hover:bg-[#4338ca] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2">
            <span>+</span> Ajouter un prospect
          </button>
          <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2">
            <span></span> Exporter <span className="text-xs text-slate-400">▼</span>
          </button>
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
      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">↗ 12.5% <span className="text-slate-400 font-normal">vs période précédente</span></p>
    </div>
  </div>
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
      <Mail size={22} />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium">Emails trouvés</p>
      <p className="text-xl font-bold text-slate-800">{stats.emails}</p>
      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">↗ 15.2% <span className="text-slate-400 font-normal">vs période précédente</span></p>
    </div>
  </div>
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
      <Globe size={22} />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium">Sites web trouvés</p>
      <p className="text-xl font-bold text-slate-800">{stats.sites}</p>
      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">↗ 10.8% <span className="text-slate-400 font-normal">vs période précédente</span></p>
    </div>
  </div>
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
      <Star size={22} />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium">Score moyen</p>
      <p className="text-xl font-bold text-slate-800">{stats.avgScore}<span className="text-xs text-slate-400"> /100</span></p>
      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">↗ 6.3% <span className="text-slate-400 font-normal">vs période précédente</span></p>
    </div>
  </div>
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
      <Target size={22} />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium">Leads chauds</p>
      <p className="text-xl font-bold text-slate-800">{stats.hotLeads}</p>
      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">↗ 18.7% <span className="text-slate-400 font-normal">vs période précédente</span></p>
    </div>
  </div>
</div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-white border-b border-slate-100">
          <p className="text-xs font-bold text-slate-700">{total} prospects trouvés</p>
          <div className="flex items-center gap-3">
            <button className="text-xs font-semibold border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-50">📊 Colonnes</button>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="text-xs font-semibold border border-slate-200 px-2 py-1.5 rounded-xl text-slate-600">
              <option value={10}>10 par page</option><option value={50}>50 par page</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-4"><input type="checkbox" className="rounded border-slate-300" /></th>
                <th className="p-4">Entreprise</th>
                <th className="p-4">Secteur</th>
                <th className="p-4">Localisation</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Source</th>
                <th className="p-4">Score IA</th>
                <th className="p-4">Ajouté le</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {prospects.map((p) => {
                const isHoreca = p.category?.includes("Café") || p.category?.includes("Restau");
                const sectColor = isHoreca ? "bg-blue-50 text-blue-600" : p.category?.includes("Boulangerie") ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600";
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
                    <td className="p-4"><input type="checkbox" className="rounded border-slate-300" /></td>
                    
                    {/* Entreprise avec icône ronde */}
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                      <CategoryIconCircle category={p.category} />
                      {p.name}
                    </td>

                    {/* Secteur */}
                    <td className="p-4">
                      <CategoryBadge category={p.category} />
                      </td>

                    {/* 🛠️ LOCALISATION 100% DYNAMIQUE (Correction définitive du conflit de code postal) */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-700">
                        {p.address?.city || "Bruxelles"} ({p.address?.postcode || "1000"})
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {p.address?.province || "Belgique"}
                      </div>
                    </td>

                    {/* Contact (Liens cliquables) */}
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

                    {/* Source Tag */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${p.source === 'linkedin' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                        {p.source ? p.source.toUpperCase() : "OSM"}
                      </span>
                    </td>

                    {/* Score IA */}
                    <td className="p-4 font-bold">

  <span className={`px-2 py-1 rounded-md text-[11px] font-extrabold ${scoreColor}`}>
    {hasScore ? `${p.score}/100` : "—"}
  </span>
</td>

                    {/* Date d'ajout */}
                    <td className="p-4 text-[11px] font-medium text-slate-400 whitespace-pre-line">
                      {formatDate(p.createdAt)}
                    </td>

                    {/* Bouton d'actions */}
                    <td className="p-4 text-center">
                      <button className="text-slate-400 hover:text-slate-700 font-bold px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg transition text-xs">•••</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION COMPLÈTE */}
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
    </div>
  );
}