"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  MapPin,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";

interface WebSource {
  title: string;
  snippet: string;
  url: string;
}

interface Report {
  _id: string;
  prospect_id: string;
  name: string;
  category: string;
  address: { street?: string; housenumber?: string; city?: string; postcode?: string; province?: string };
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string;
  score: number;
  presence_digitale: string;
  analyse: string;
  forces: string[];
  faiblesses: string[];
  argumentaire: string;
  web_sources?: WebSource[];
  requestedBy?: { userName?: string };
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Tab = "resume" | "informations" | "analyse" | "argumentaire" | "sources";

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("resume");

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await axios.get(`${API_URL}/api/reports/${params.id}`);
        setReport(res.data);
      } catch (error) {
        console.error("Erreur chargement rapport:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-12 min-h-screen bg-gradient-to-br from-purple-50/40 via-white to-fuchsia-50/30 flex items-center justify-center">
        <div className="inline-flex items-center gap-3 text-gray-400 font-medium">
          <div className="w-5 h-5 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
          Chargement du rapport…
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-rose-500 font-medium">
        Rapport non trouvé.
        <button onClick={() => router.push("/agent")} className="block mt-4 text-purple-600 underline mx-auto">
          Retour à l&apos;agent
        </button>
      </div>
    );
  }

  const scoreLabel = report.score >= 70 ? "Élevé" : report.score >= 50 ? "Moyen" : "Faible";
  const scoreColorText =
    report.score >= 70 ? "text-emerald-600" : report.score >= 50 ? "text-amber-600" : "text-rose-500";
  const scoreRing =
    report.score >= 70
      ? "from-emerald-400 to-emerald-600"
      : report.score >= 50
      ? "from-amber-400 to-orange-500"
      : "from-rose-400 to-red-500";

  return (
    <div className="p-8 bg-gradient-to-br from-purple-50/40 via-white to-fuchsia-50/30 min-h-screen text-gray-900">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400 mb-3 flex items-center gap-2">
        <span>Agent IA</span> <span className="text-purple-300">›</span> <span>Bilan de prospection</span>{" "}
        <span className="text-purple-300">›</span>
        <span className="text-purple-700 font-medium">{report.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-purple-100/70 text-purple-700 text-xs font-medium ring-1 ring-purple-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            RAG + Agent LangGraph
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-800 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent tracking-tight">
            Bilan de prospection
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">Analyse complète générée par l&apos;IA</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2.5 border border-purple-200/70 bg-white/80 backdrop-blur-sm rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-300/50 hover:shadow-lg hover:shadow-purple-400/50 hover:-translate-y-0.5 transition-all duration-200">
            <RefreshCw size={16} /> Régénérer le bilan
          </button>
          <a
            href={`${API_URL}/api/reports/${report._id}/export/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-purple-200/70 bg-white/80 backdrop-blur-sm rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200"
          >
            <Download size={16} /> PDF
          </a>
          <a
            href={`${API_URL}/api/reports/${report._id}/export/excel`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-purple-200/70 bg-white/80 backdrop-blur-sm rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200"
          >
            <Download size={16} /> Excel
          </a>
        </div>
      </div>

      {/* Carte entreprise + score */}
      <div className="relative bg-white/80 backdrop-blur-sm border border-purple-100/70 rounded-2xl p-6 mb-6 flex items-start justify-between gap-6 shadow-lg shadow-purple-100/40 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-purple-200/40 to-fuchsia-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-4 relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center text-3xl ring-1 ring-purple-200/60 shadow-inner">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">{report.name}</h2>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="bg-purple-100/80 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ring-purple-200/60">
                {report.category}
              </span>
              <span className="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 ring-gray-200/60">
                Source : {report.source?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-3">
              <MapPin size={14} className="text-purple-400" />
              {report.address?.street} {report.address?.housenumber}, {report.address?.postcode}{" "}
              {report.address?.city}
            </p>
            <p className="text-xs text-gray-400 mt-1 ml-5">{report.address?.province}, Belgique</p>

            <div className="flex gap-2 mt-4 flex-wrap">
              {report.phone && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50/70 rounded-lg text-xs text-gray-700 ring-1 ring-purple-100 hover:bg-purple-100/60 transition-colors">
                  <Phone size={12} className="text-purple-500" /> {report.phone}
                </span>
              )}
              {report.email && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50/70 rounded-lg text-xs text-gray-700 ring-1 ring-purple-100 hover:bg-purple-100/60 transition-colors">
                  <Mail size={12} className="text-purple-500" /> {report.email}
                </span>
              )}
              {report.website && (
                <a
                  href={report.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50/70 rounded-lg text-xs text-purple-700 ring-1 ring-purple-100 hover:bg-purple-100/60 hover:underline transition-colors"
                >
                  <Globe size={12} /> Site web
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Score circulaire */}
        <div className="flex flex-col items-center relative">
          <div className={`p-[3px] rounded-full bg-gradient-to-br ${scoreRing} shadow-md`}>
            <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${scoreColorText}`}>{report.score}</div>
                <div className="text-xs text-gray-400">/100</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2.5">Score de prospection</p>
          <span className={`text-xs font-semibold mt-0.5 ${scoreColorText}`}>{scoreLabel}</span>
        </div>
      </div>

      {/* Indicateurs rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Demandé par", value: report.requestedBy?.userName || "Système", plain: true },
          { label: "Email trouvé", ok: !!report.email },
          { label: "Téléphone trouvé", ok: !!report.phone },
          { label: "Site web trouvé", ok: !!report.website },
        ].map((k, i) => (
          <div
            key={i}
            className="group bg-white/80 backdrop-blur-sm border border-purple-100/70 rounded-2xl p-4 shadow-sm hover:shadow-md hover:shadow-purple-200/40 hover:-translate-y-0.5 hover:border-purple-200 transition-all duration-300"
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider">{k.label}</p>
            {k.plain ? (
              <p className="font-semibold text-gray-900 mt-1.5">{k.value}</p>
            ) : (
              <p className="font-semibold flex items-center gap-1.5 mt-1.5">
                {k.ok ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-500" />{" "}
                    <span className="text-gray-800">Oui</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-rose-400" />{" "}
                    <span className="text-gray-500">Non</span>
                  </>
                )}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm border border-purple-100/70 rounded-2xl overflow-hidden shadow-lg shadow-purple-100/40">
        <div className="flex border-b border-purple-100/70 px-5 overflow-x-auto bg-gradient-to-r from-purple-50/50 to-transparent">
          {[
            { id: "resume", label: "Résumé" },
            { id: "informations", label: "Informations" },
            { id: "analyse", label: "Analyse IA" },
            { id: "argumentaire", label: "Argumentaire" },
            { id: "sources", label: `Sources web (${report.web_sources?.length || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as Tab)}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                tab === t.id
                  ? "border-purple-500 text-purple-700 font-semibold"
                  : "border-transparent text-gray-500 hover:text-purple-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Tabs */}
        <div className="p-6">
          {tab === "resume" && (
            <div className="space-y-6">
              <div className="relative bg-gradient-to-br from-purple-50/80 to-fuchsia-50/40 border border-purple-200/60 rounded-xl p-5 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-fuchsia-500" />
                <h4 className="font-semibold text-sm text-purple-900 mb-2">Résumé de l&apos;analyse IA</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{report.analyse}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-5">
                  <h4 className="font-semibold text-sm text-emerald-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Forces
                  </h4>
                  <ul className="space-y-2.5">
                    {report.forces?.map((f, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-5">
                  <h4 className="font-semibold text-sm text-rose-600 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Faiblesses
                  </h4>
                  <ul className="space-y-2.5">
                    {report.faiblesses?.map((f, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <XCircle size={15} className="text-rose-400 mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tab === "informations" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
              {[
                ["Secteur", report.category],
                ["Ville / Code postal", `${report.address?.city} (${report.address?.postcode})`],
                ["Province", report.address?.province],
                ["Source", report.source?.toUpperCase()],
                ["Collecté le", new Date(report.createdAt).toLocaleDateString("fr-BE")],
              ].map(([k, v], i) => (
                <div
                  key={i}
                  className="flex justify-between border-b border-purple-50 py-3 hover:bg-purple-50/40 px-2 -mx-2 rounded-md transition-colors"
                >
                  <span className="text-gray-400">{k}</span>
                  <span className="text-gray-900 font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "analyse" && (
            <div className="bg-purple-50/30 border border-purple-100 rounded-xl p-5">
              <h4 className="font-semibold text-sm text-purple-800 mb-2">Analyse complète</h4>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.analyse}</p>
            </div>
          )}

          {tab === "argumentaire" && (
            <div className="bg-gradient-to-br from-purple-50/60 to-fuchsia-50/30 border border-purple-100 rounded-xl p-5">
              <h4 className="font-semibold text-sm text-purple-800 mb-2">
                Argumentaire commercial suggéré
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {report.argumentaire}
              </p>
            </div>
          )}

          {tab === "sources" && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h4 className="font-semibold text-sm text-gray-900">
                  Sources web utilisées pour l&apos;analyse RAG
                </h4>
                <span className="text-xs text-gray-400 px-2 py-1 bg-purple-50 rounded-md ring-1 ring-purple-100">
                  Recherche via Tavily API
                </span>
              </div>

              {!report.web_sources || report.web_sources.length === 0 ? (
                <p className="text-sm text-gray-400 italic bg-gray-50 border border-gray-100 rounded-lg p-4">
                  Aucune source web n&apos;a été trouvée pour cette entreprise. L&apos;analyse repose uniquement sur les données internes (OSM).
                </p>
              ) : (
                <div className="space-y-3">
                  {report.web_sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-xl hover:bg-purple-50/50 transition-all duration-200 group border border-purple-100/70 hover:border-purple-300 hover:shadow-md hover:shadow-purple-100/60 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                            {s.title}
                          </h5>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.snippet}</p>
                          <p className="text-xs text-purple-400/80 mt-2 truncate max-w-xl">{s.url}</p>
                        </div>
                        <ExternalLink
                          size={14}
                          className="text-gray-400 flex-shrink-0 mt-1 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                        />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
