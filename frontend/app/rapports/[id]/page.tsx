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
    return <div className="p-8 text-center text-gray-400 font-medium">Chargement du rapport...</div>;
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Rapport non trouvé.
        <button onClick={() => router.push("/agent")} className="block mt-4 text-accent underline mx-auto">
          Retour à l&apos;agent
        </button>
      </div>
    );
  }

  const scoreLabel = report.score >= 70 ? "Élevé" : report.score >= 50 ? "Moyen" : "Faible";
  const scoreColor = report.score >= 70 ? "text-green" : report.score >= 50 ? "text-orange" : "text-red-500";

  return (
    <div className="p-8 bg-content-bg min-h-screen text-gray-900">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
        <span>Agent IA</span> <span>›</span> <span>Bilan de prospection</span> <span>›</span>
        <span className="text-gray-700 font-medium">{report.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bilan de prospection</h1>
          <p className="text-sm text-gray-500">Analyse complète générée par l&apos;IA (RAG + Agent LangGraph)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2.5 border border-border-color rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
            <RefreshCw size={16} /> Régénérer le bilan
          </button>
          <a
            href={`${API_URL}/api/reports/${report._id}/export/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-border-color rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
          >
            <Download size={16} /> PDF
          </a>
          <a
            href={`${API_URL}/api/reports/${report._id}/export/excel`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-border-color rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
          >
            <Download size={16} /> Excel
          </a>
        </div>
      </div>

      {/* Carte entreprise + score */}
      <div className="bg-white border border-border-color rounded-xl p-6 mb-6 flex items-start justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-3xl">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{report.name}</h2>
              <CheckCircle2 size={18} className="text-green" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-accent-light text-accent px-2 py-1 rounded-md text-xs font-medium">
                {report.category}
              </span>
              <span className="bg-content-bg text-gray-500 px-2 py-1 rounded-md text-xs font-medium">
                Source : {report.source?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-2">
              <MapPin size={14} />
              {report.address?.street} {report.address?.housenumber}, {report.address?.postcode}{" "}
              {report.address?.city}
            </p>
            <p className="text-xs text-gray-400 mt-1">{report.address?.province}, Belgique</p>

            <div className="flex gap-3 mt-3">
              {report.phone && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-content-bg rounded-lg text-xs text-gray-700">
                  <Phone size={12} /> {report.phone}
                </span>
              )}
              {report.email && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-content-bg rounded-lg text-xs text-gray-700">
                  <Mail size={12} /> {report.email}
                </span>
              )}
              {report.website && (
                <a
                  href={report.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-content-bg rounded-lg text-xs text-accent hover:underline"
                >
                  <Globe size={12} /> Site web
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Score circulaire */}
        <div className="flex flex-col items-center">
          <div className={`w-28 h-28 rounded-full border-8 border-content-bg flex items-center justify-center ${scoreColor}`}>
            <div className="text-center">
              <div className="text-3xl font-bold">{report.score}</div>
              <div className="text-xs text-gray-400">/100</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Score de prospection</p>
          <span className={`text-xs font-medium mt-1 ${scoreColor}`}>{scoreLabel}</span>
        </div>
      </div>

      {/* Indicateurs rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-border-color rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Demandé par</p>
          <p className="font-semibold text-gray-900 mt-1">{report.requestedBy?.userName || "Système"}</p>
        </div>
        <div className="bg-white border border-border-color rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Email trouvé</p>
          <p className="font-semibold flex items-center gap-1.5 mt-1">
            {report.email ? (
              <>
                <CheckCircle2 size={16} className="text-green" /> Oui
              </>
            ) : (
              <>
                <XCircle size={16} className="text-red-400" /> Non
              </>
            )}
          </p>
        </div>
        <div className="bg-white border border-border-color rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Téléphone trouvé</p>
          <p className="font-semibold flex items-center gap-1.5 mt-1">
            {report.phone ? (
              <>
                <CheckCircle2 size={16} className="text-green" /> Oui
              </>
            ) : (
              <>
                <XCircle size={16} className="text-red-400" /> Non
              </>
            )}
          </p>
        </div>
        <div className="bg-white border border-border-color rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Site web trouvé</p>
          <p className="font-semibold flex items-center gap-1.5 mt-1">
            {report.website ? (
              <>
                <CheckCircle2 size={16} className="text-green" /> Oui
              </>
            ) : (
              <>
                <XCircle size={16} className="text-red-400" /> Non
              </>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-border-color rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b border-border-color px-5 overflow-x-auto">
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
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Tabs */}
        <div className="p-6">
          {tab === "resume" && (
            <div className="space-y-5">
              <div className="bg-accent-light/30 border border-accent/20 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Résumé de l&apos;analyse IA</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{report.analyse}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-green mb-3">Forces</h4>
                  <ul className="space-y-2">
                    {report.forces?.map((f, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle2 size={15} className="text-green mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-red-500 mb-3">Faiblesses</h4>
                  <ul className="space-y-2">
                    {report.faiblesses?.map((f, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <XCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tab === "informations" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between border-b border-border-color py-2.5">
                <span className="text-gray-400">Secteur</span>
                <span className="text-gray-900 font-medium">{report.category}</span>
              </div>
              <div className="flex justify-between border-b border-border-color py-2.5">
                <span className="text-gray-400">Ville / Code postal</span>
                <span className="text-gray-900 font-medium">
                  {report.address?.city} ({report.address?.postcode})
                </span>
              </div>
              <div className="flex justify-between border-b border-border-color py-2.5">
                <span className="text-gray-400">Province</span>
                <span className="text-gray-900 font-medium">{report.address?.province}</span>
              </div>
              <div className="flex justify-between border-b border-border-color py-2.5">
                <span className="text-gray-400">Source</span>
                <span className="text-gray-900 font-medium">{report.source?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-border-color py-2.5">
                <span className="text-gray-400">Collecté le</span>
                <span className="text-gray-900 font-medium">
                  {new Date(report.createdAt).toLocaleDateString("fr-BE")}
                </span>
              </div>
            </div>
          )}

          {tab === "analyse" && (
            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Analyse complète</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{report.analyse}</p>
            </div>
          )}

          {tab === "argumentaire" && (
            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Argumentaire commercial suggéré</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{report.argumentaire}</p>
            </div>
          )}

          {tab === "sources" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-900">
                  Sources web utilisées pour l&apos;analyse RAG
                </h4>
                <span className="text-xs text-gray-400">Recherche via Tavily API</span>
              </div>

              {!report.web_sources || report.web_sources.length === 0 ? (
                <p className="text-sm text-gray-400">
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
                      className="block p-4 bg-content-bg rounded-lg hover:bg-accent-light/30 transition-colors group border border-transparent hover:border-border-color"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-sm font-semibold text-gray-900 group-hover:text-accent transition-colors">
                            {s.title}
                          </h5>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.snippet}</p>
                          <p className="text-xs text-gray-400 mt-2 truncate max-w-xl">{s.url}</p>
                        </div>
                        <ExternalLink size={14} className="text-gray-400 flex-shrink-0 mt-1 group-hover:text-accent transition-colors" />
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