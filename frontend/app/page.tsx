"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  User,
  Building2,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Trash2,
  FileText,
  ChevronRight,
  Info,
  History,
  Command,
  Zap,
  TrendingUp,
  Radar,
  Database,
  Layers,
  ArrowUpRight,
} from "lucide-react";

interface Message {
  role: "user" | "agent";
  content: string;
  suggestedActions?: string[];
  timestamp: string;
  report?: Report;
  scraping?: ScrapingResult;
}

interface Report {
  _id: string;
  prospect_id: string;
  name: string;
  category: string;
  address: { city?: string; postcode?: string; street?: string };
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
}

interface ConversationSummary {
  _id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

interface Prospect {
  _id?: string;
  name: string;
  category?: string;
  address?: { city?: string; postcode?: string; street?: string };
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface ScrapingResult {
  session_id: string;
  category: string;
  postalCode: string;
  totalFound: number;
  inserted: number;
  skipped: number;
  sample: Prospect[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const AI_URL = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:5001";

const defaultMessageContent =
  "Je suis votre assistant de prospection intelligent spécialisé sur le marché belge. Voici ce que nous pouvons faire ensemble :\n\n" +
  "✦ **Recherche ciblée** : Trouvez des entreprises par secteur et code postal.\n" +
  "✦ **Analyse de données** : Générez des bilans de prospection automatisés.\n" +
  "✦ **Suivi intelligent** : Je garde en mémoire notre fil de discussion pour affiner les résultats.";

const defaultActions = [
  "Restaurants à 1000 Bruxelles",
  "Cafés à 2000 Anvers",
  "Pharmacies à 5000 Namur",
];

// Le backend renvoie parfois les compteurs sous des noms différents (ou pas du tout),
// alors qu'ils sont presque toujours présents dans le texte de la réponse
// (ex : "J'ai trouvé 160 éléments... dont 0 nouveaux profils... 160 profils déjà enregistrés").
// Ce parseur sert de filet de sécurité pour ne jamais afficher 0 par erreur.
function parseScrapingStatsFromText(text: string) {
  const totalMatch =
    text.match(/trouvé\s+(\d+)\s+élément/i) || text.match(/(\d+)\s+élément[s]?\s+OSM/i);
  const insertedMatch =
    text.match(/(\d+)\s+nouveau[x]?\s+profil/i) || text.match(/(\d+)\s+nouvelle[s]?\s+entrepr/i);
  const skippedMatch =
    text.match(/(\d+)\s+profil[s]?\s+déjà/i) || text.match(/(\d+)\s+entrepr\w*\s+déjà/i);

  return {
    total: totalMatch ? parseInt(totalMatch[1], 10) : undefined,
    inserted: insertedMatch ? parseInt(insertedMatch[1], 10) : undefined,
    skipped: skippedMatch ? parseInt(skippedMatch[1], 10) : undefined,
  };
}

// Retrouve la dernière session de scraping connue dans un historique de messages,
// pour pouvoir la garder accessible même après plusieurs nouveaux messages.
function findLastScraping(msgs: Message[]): ScrapingResult | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].scraping) return msgs[i].scraping as ScrapingResult;
  }
  return null;
}

export default function AgentPage() {
  function nowTime() {
    return new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  }

  const { user, token } = useAuth();
  const avatarUrl = user?.avatarUrl;
  const canChat = user?.role !== "Viewer";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [activeScrapingResult, setActiveScrapingResult] = useState<ScrapingResult | null>(null);
  const [lastScraping, setLastScraping] = useState<ScrapingResult | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userName = user?.name || "Utilisateur";
  const greeting = "Bonjour";

  const getAuthConfig = useCallback(() => {
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, [token]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/conversations`, getAuthConfig());
      const data: ConversationSummary[] = res.data || [];
      setConversations(data);
      if (data.length > 0) {
        const conv = data[0];
        setConversationId(conv._id);
        if (conv.messages && conv.messages.length > 0) {
          setMessages(conv.messages);
          setLastScraping(findLastScraping(conv.messages));
          localStorage.setItem("agent_chat_history", JSON.stringify(conv.messages));
        }
      } else {
        const title = `Conversation IA - ${new Date().toLocaleDateString("fr-FR")}`;
        const createRes = await axios.post(
          `${API_URL}/api/conversations`,
          { title, messages: [] },
          getAuthConfig()
        );
        setConversationId(createRes.data._id);
        setConversations([createRes.data]);
      }
    } catch (error) {
      console.error("Erreur chargement conversations :", error);
    }
  }, [token, getAuthConfig]);

  const saveConversation = async (updatedMessages: Message[]) => {
    if (!token || !conversationId) return;
    try {
      await axios.put(
        `${API_URL}/api/conversations/${conversationId}`,
        { messages: updatedMessages },
        getAuthConfig()
      );
    } catch (error) {
      console.error("Erreur sauvegarde conversation :", error);
    }
  };

  const loadConversation = (conv: ConversationSummary) => {
    setConversationId(conv._id);
    setMessages(conv.messages || []);
    setLastScraping(findLastScraping(conv.messages || []));
    setActiveScrapingResult(null);
    setActiveReport(null);
    setShowHistory(false);
    localStorage.setItem("agent_chat_history", JSON.stringify(conv.messages || []));
  };

  const deleteConversation = async (id: string) => {
    if (!token) return;
    if (!confirm("Confirmer la suppression de cette conversation ?")) return;
    try {
      await axios.delete(`${API_URL}/api/conversations/${id}`, getAuthConfig());
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (conversationId === id) {
        localStorage.removeItem("agent_chat_history");
        setConversationId(null);
        setMessages([
          {
            role: "agent",
            content: defaultMessageContent,
            suggestedActions: defaultActions,
            timestamp: nowTime(),
          },
        ]);
        setActiveReport(null);
        setActiveScrapingResult(null);
        setLastScraping(null);
      }
    } catch (error) {
      console.error("Erreur suppression conversation:", error);
    }
  };

  useEffect(() => {
    const loadChatHistory = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("agent_chat_history");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              setLastScraping(findLastScraping(parsed));
              setMounted(true);
              return;
            }
          } catch (e) {
            console.error("Erreur historique:", e);
          }
        }
      }

      setMessages([
        {
          role: "agent",
          content: defaultMessageContent,
          suggestedActions: defaultActions,
          timestamp: nowTime(),
        },
      ]);
      setMounted(true);
    };

    loadChatHistory();
  }, []);

  useEffect(() => {
    if (!mounted || !token) return;
    const fetchConversations = async () => {
      await loadConversations();
    };
    fetchConversations();
  }, [mounted, token, loadConversations]);

  useEffect(() => {
    if (mounted && typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("agent_chat_history", JSON.stringify(messages));
    }
  }, [messages, mounted]);

  useEffect(() => {
    if (mounted) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mounted]);

  async function sendMessage(text: string) {
    if (!canChat) {
      alert("Vous n'avez pas l'accès pour discuter avec le chat. Contactez l'administrateur.");
      return;
    }
    if (!text.trim()) return;

    const userMessage: Message = { role: "user", content: text, timestamp: nowTime() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${AI_URL}/agent/chat`, {
        message: text,
        history: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        userId: user?.id,
        userName: user?.name,
      });

      let scrapingForMessage: ScrapingResult | undefined;
      if (res.data?.session_id && res.data?.intent === "scrape") {
        const d = res.data;
        // Le texte de la réponse contient quasi-toujours les vrais chiffres
        // (utile en filet de sécurité si le backend n'envoie pas de champs structurés,
        // ou envoie des noms de champs différents selon les versions de l'API).
        const parsedFromText = parseScrapingStatsFromText(d.response || "");

        const totalFound =
          d.total_found ?? d.totalFound ?? d.found_count ?? d.foundCount ??
          parsedFromText.total ?? d.scraped_count ?? 0;

        const inserted =
          d.inserted ?? d.inserted_count ?? d.insertedCount ?? d.new_count ?? d.newCount ??
          parsedFromText.inserted ?? 0;

        const skipped =
          d.skipped ?? d.skipped_count ?? d.skippedCount ?? d.existing_count ?? d.existingCount ??
          parsedFromText.skipped ?? Math.max(totalFound - inserted, 0);

        scrapingForMessage = {
          session_id: d.session_id,
          category: d.category || "",
          postalCode: d.postalCode || "",
          totalFound,
          inserted,
          skipped,
          sample: d.prospects_sample || [],
        };
      }

      const agentMessage: Message = {
        role: "agent",
        content: res.data?.response ?? "Je n'ai pas pu obtenir de réponse.",
        timestamp: nowTime(),
        suggestedActions: res.data?.suggested_actions,
        report: res.data?.report,
        scraping: scrapingForMessage,
      };

      const finalMessages = [...updatedMessages, agentMessage];
      setMessages(finalMessages);

      // On ne ferme le panneau scraping que si un VRAI bilan (avec un nom) arrive,
      // pas juste parce que le backend renvoie un champ "report" vide/falsy sur chaque message.
      if (res.data?.report?.name) {
        setActiveReport(res.data.report);
        setActiveScrapingResult(null);
      }

      if (scrapingForMessage) {
        setActiveScrapingResult(scrapingForMessage);
        setLastScraping(scrapingForMessage);
        setActiveReport(null);
      }

      let activeConvId = conversationId;
      if (!activeConvId && token) {
        try {
          const title = `Conversation IA - ${new Date().toLocaleDateString("fr-FR")}`;
          const createRes = await axios.post(
            `${API_URL}/api/conversations`,
            { title, messages: [] },
            getAuthConfig()
          );
          activeConvId = createRes.data._id;
          setConversationId(activeConvId);
          setConversations((prev) => [createRes.data, ...prev]);
        } catch (err) {
          console.error("Erreur création conversation:", err);
        }
      }

      if (activeConvId) {
        try {
          await axios.put(
            `${API_URL}/api/conversations/${activeConvId}`,
            { messages: finalMessages },
            getAuthConfig()
          );
        } catch (err) {
          console.error("Erreur sauvegarde conversation :", err);
        }
      }
    } catch (error) {
      console.error("Erreur agent:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content:
            "Désolé, un problème de connexion est survenu avec le service IA. Vérifiez que votre backend est actif.",
          timestamp: nowTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
  }

  async function resetConversation() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("agent_chat_history");
  }

  const initialMessage: Message = {
    role: "agent",
    content: defaultMessageContent,
    suggestedActions: defaultActions,
    timestamp: nowTime(),
  };

  setMessages([initialMessage]);
  setActiveReport(null);
  setActiveScrapingResult(null);
  setLastScraping(null);

  // ✅ Crée une vraie nouvelle conversation en base
  if (token) {
    try {
      const title = `Conversation IA - ${new Date().toLocaleDateString("fr-FR")}`;
      const res = await axios.post(
        `${API_URL}/api/conversations`,
        { title, messages: [initialMessage] },
        getAuthConfig()
      );
      setConversationId(res.data._id);
      setConversations((prev) => [res.data, ...prev]); // ajoute en tête de liste
    } catch (err) {
      console.error("Erreur création nouvelle conversation:", err);
    }
  }
}

  const lastMessage = messages[messages.length - 1];
  const currentSuggestions = lastMessage?.role === "agent" ? lastMessage.suggestedActions : [];

  // Helper: parse **bold** in agent text
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold text-stone-900">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div
      className="h-screen flex flex-col font-sans overflow-hidden relative"
      style={{
        background:
          "radial-gradient(1200px 600px at 10% -10%, #f0ebe0 0%, transparent 60%), radial-gradient(900px 500px at 100% 0%, #e6efe9 0%, transparent 55%), linear-gradient(180deg, #faf7f2 0%, #f5f1ea 100%)",
      }}
    >
      {/* Subtle grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.35 0 0 0 0 0.3 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* HEADER */}
      <header className="relative z-10 px-6 md:px-10 py-5 flex items-center justify-between shrink-0 border-b border-stone-200/60 backdrop-blur-md bg-white/40">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl overflow-hidden border border-violet-200/70 bg-violet-700 shadow-lg shadow-violet-900/10 ring-1 ring-white/70 flex items-center justify-center">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-stone-800 flex items-center gap-2">
              {greeting}, <span className="text-violet-800">{userName}</span>
              <Sparkles size={14} className="text-amber-500" />
            </h1>
            <p className="text-[11px] text-stone-500 mt-0.5 tracking-wide">
              Assistant de prospection ·{" "}
              <span className="font-medium text-violet-700">BelgoData IA</span> · En ligne
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="group flex items-center gap-2 text-xs font-medium text-stone-700 bg-white/70 border border-stone-200/80 px-3.5 py-2 rounded-full shadow-sm hover:bg-white hover:border-stone-300 hover:shadow transition-all"
          >
            <History size={13} className="text-stone-500 group-hover:text-violet-700 transition" />
            Historique
          </button>
          <button
            onClick={resetConversation}
            className="group flex items-center gap-2 text-xs font-medium text-stone-700 bg-white/70 border border-stone-200/80 px-3.5 py-2 rounded-full shadow-sm hover:bg-white hover:border-stone-300 transition-all active:scale-95"
          >
            <RefreshCw size={13} className="text-stone-500 group-hover:rotate-180 transition-transform duration-500" />
            Nouvelle session
          </button>
        </div>
      </header>

      {!canChat && (
        <div className="relative z-10 px-8 py-2.5 bg-rose-50/80 border-b border-rose-200/60 text-rose-800 text-xs backdrop-blur-sm flex items-center gap-2">
          <Info size={13} /> Vous n&apos;avez pas l&apos;accès pour discuter avec le chat. Contactez l&apos;administrateur.
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <div className="relative z-10 flex-1 flex overflow-hidden p-4 md:p-6 gap-4 md:gap-6">
        {/* CHAT COLUMN */}
        <div
          className={`relative rounded-3xl flex flex-col overflow-hidden transition-all duration-500 ease-out ${
            activeReport || activeScrapingResult ? "w-7/12" : "w-full max-w-5xl mx-auto"
          }`}
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(252,250,246,0.75))",
            border: "1px solid rgba(120, 113, 108, 0.15)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.9) inset, 0 20px 40px -20px rgba(41, 37, 36, 0.15), 0 8px 16px -8px rgba(41, 37, 36, 0.08)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Thread */}
          <div className="flex-1 overflow-y-auto px-5 md:px-8 py-8 space-y-7">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 md:gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-[fadeIn_0.4s_ease-out]`}
              >
                {msg.role === "agent" && (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-700 to-purple-900 text-violet-50 flex items-center justify-center shadow-md shadow-violet-900/20 shrink-0 mt-0.5 ring-1 ring-white/40">
                    <Bot size={15} />
                  </div>
                )}

                <div
                  className={`max-w-[78%] flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-3 text-[14px] leading-relaxed transition-all ${
                      msg.role === "user"
                        ? "rounded-3xl rounded-br-md text-white font-medium"
                        : "rounded-3xl rounded-bl-md text-stone-800 whitespace-pre-line"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            background:
                              "linear-gradient(135deg, #7c3aed 0%, #6d28d9 55%, #4c1d95 100%)",
                            boxShadow:
                              "0 8px 20px -8px rgba(6, 78, 59, 0.45), 0 2px 4px rgba(6, 78, 59, 0.15)",
                          }
                        : {
                            background: "rgba(255, 253, 250, 0.9)",
                            border: "1px solid rgba(214, 208, 200, 0.5)",
                            boxShadow: "0 2px 8px -2px rgba(41, 37, 36, 0.06)",
                          }
                    }
                  >
                    {msg.role === "agent" ? renderContent(msg.content) : msg.content}
                  </div>

                  {msg.report && (
                    <button
                      onClick={() => setActiveReport(msg.report!)}
                      className="mt-2.5 group flex items-center gap-2 px-3.5 py-2 bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/70 rounded-2xl text-xs text-amber-900 font-medium hover:from-amber-100 hover:to-orange-100/60 hover:border-amber-300 transition-all shadow-sm"
                    >
                      <Building2 size={13} className="text-amber-700" />
                      Ouvrir le bilan de{" "}
                      <span className="font-semibold">{msg.report.name}</span>
                      <ChevronRight
                        size={13}
                        className="text-amber-700 group-hover:translate-x-0.5 transition-transform"
                      />
                    </button>
                  )}

                  {msg.scraping && (
                    <button
                      onClick={() => {
                        setActiveScrapingResult(msg.scraping!);
                        setActiveReport(null);
                      }}
                      className="mt-2.5 group flex items-center gap-2 px-3.5 py-2 bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-200/70 rounded-2xl text-xs text-violet-900 font-medium hover:from-violet-100 hover:to-purple-100/60 hover:border-violet-300 transition-all shadow-sm"
                    >
                      <Radar size={13} className="text-violet-700" />
                      Ouvrir la session{" "}
                      <span className="font-semibold">
                        {msg.scraping.category || "scraping"}
                        {msg.scraping.postalCode ? ` · ${msg.scraping.postalCode}` : ""}
                      </span>
                      <span className="ml-1 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-bold tabular-nums border border-violet-200/70">
                        {msg.scraping.totalFound}
                      </span>
                      <ChevronRight
                        size={13}
                        className="text-violet-700 group-hover:translate-x-0.5 transition-transform"
                      />
                    </button>
                  )}

                  <span className="text-[10px] text-stone-400 mt-1.5 px-1.5 tracking-wide">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === "user" && (
                  <div className="w-9 h-9 rounded-2xl overflow-hidden border border-stone-300/60 shadow-sm shrink-0 mt-0.5 relative bg-stone-100">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Avatar utilisateur" fill sizes="32px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-600 text-[10px] font-bold">
                        {user?.name?.slice(0, 2).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-700 to-purple-900 flex items-center justify-center text-violet-50 shrink-0 shadow-md shadow-violet-900/20">
                  <Bot size={15} />
                </div>
                <div
                  className="px-4 py-3 rounded-3xl rounded-bl-md text-xs text-stone-600 font-medium flex items-center gap-3"
                  style={{
                    background: "rgba(255, 253, 250, 0.9)",
                    border: "1px solid rgba(214, 208, 200, 0.5)",
                  }}
                >
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  <span className="italic text-stone-500">Analyse des données belges…</span>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* Composer */}
          <div
            className="px-5 md:px-6 pt-4 pb-5 space-y-3 shrink-0"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(250,247,242,0.7) 30%)",
              borderTop: "1px solid rgba(214, 208, 200, 0.4)",
            }}
          >
            {lastScraping && !activeScrapingResult && (
              <button
                onClick={() => {
                  setActiveScrapingResult(lastScraping);
                  setActiveReport(null);
                }}
                className="group w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-medium bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-200/70 text-violet-900 hover:from-violet-100 hover:to-purple-100/60 hover:border-violet-300 transition-all shadow-sm"
              >
                <Radar size={13} className="text-violet-700 shrink-0" />
                <span className="truncate">
                  Reprendre la session scraping{" "}
                  <span className="font-semibold">
                    {lastScraping.category || "prospection"}
                    {lastScraping.postalCode ? ` · ${lastScraping.postalCode}` : ""}
                  </span>
                </span>
                <span className="ml-auto px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-bold tabular-nums border border-violet-200/70 shrink-0">
                  {lastScraping.totalFound}
                </span>
                <ChevronRight
                  size={13}
                  className="text-violet-700 group-hover:translate-x-0.5 transition-transform shrink-0"
                />
              </button>
            )}

            {canChat && currentSuggestions && currentSuggestions.length > 0 && !loading && (
              <div className="flex flex-wrap gap-2">
                {currentSuggestions.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="group text-xs bg-white/80 border border-stone-200/80 text-stone-700 px-3.5 py-2 rounded-full hover:bg-violet-50 hover:text-violet-800 hover:border-violet-200 transition-all font-medium flex items-center gap-2 shadow-sm hover:shadow"
                  >
                    <Zap size={11} className="text-amber-500 group-hover:text-violet-600 transition" />
                    {action}
                  </button>
                ))}
              </div>
            )}

            {canChat ? (
              <form
                onSubmit={handleSubmit}
                className="flex gap-2 items-center p-1.5 rounded-2xl bg-white/90 border border-stone-200/80 shadow-sm focus-within:border-violet-400 focus-within:shadow-md focus-within:ring-4 focus-within:ring-violet-500/10 transition-all"
              >
                <div className="pl-3 text-stone-400">
                  <Command size={15} />
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Décrivez votre recherche — ex : Électriciens à Namur 5000…"
                  className="flex-1 px-2 py-2.5 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="text-white px-4 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0 flex items-center gap-2 font-medium text-xs"
                  style={{
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)",
                    boxShadow: "0 6px 16px -6px rgba(6, 78, 59, 0.5)",
                  }}
                >
                  <Send size={13} />
                  Envoyer
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-stone-50/80 border border-stone-200/60 rounded-2xl text-sm text-stone-600">
                <Info size={14} />
                <div>Accès en lecture seule. Contactez l&apos;administrateur pour discuter.</div>
              </div>
            )}
            <p className="text-[10px] text-stone-400 text-center tracking-wide">
              Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-500 font-mono text-[9px]">Entrée</kbd> pour envoyer · Les réponses de l&apos;IA peuvent contenir des erreurs.
            </p>
          </div>
        </div>

        {/* REPORT PANEL */}
        {activeReport && (
          <div
            className="w-5/12 rounded-3xl flex flex-col overflow-hidden animate-[slideIn_0.4s_ease-out]"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(252,250,246,0.8))",
              border: "1px solid rgba(120, 113, 108, 0.15)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.9) inset, 0 20px 40px -20px rgba(41, 37, 36, 0.18)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="px-6 py-4 border-b border-stone-200/50 flex items-center justify-between shrink-0 bg-gradient-to-r from-stone-50/50 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200/60 flex items-center justify-center">
                  <FileText size={14} className="text-amber-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-stone-800 text-sm">Fiche prospect</h2>
                  <p className="text-[10px] text-stone-500 tracking-wide uppercase">Qualifiée par l&apos;IA</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
              {/* Identity + Score */}
              <div
                className="relative overflow-hidden flex items-start justify-between p-5 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f5f1ea 0%, #ede7dc 100%)",
                  border: "1px solid rgba(180, 168, 148, 0.3)",
                }}
              >
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-violet-200/20 blur-2xl" />
                <div className="space-y-2 relative">
                  <span className="text-[10px] font-semibold bg-white/70 text-violet-800 px-2.5 py-1 rounded-full uppercase tracking-wider border border-violet-200/50">
                    {activeReport.category || "Secteur non défini"}
                  </span>
                  <h3 className="font-bold text-stone-900 text-lg leading-tight pt-1">
                    {activeReport.name}
                  </h3>
                  <p className="text-xs text-stone-600 flex items-center gap-1.5">
                    <MapPin size={12} className="text-stone-500" />
                    {activeReport.address?.street}, {activeReport.address?.postcode}{" "}
                    {activeReport.address?.city}
                  </p>
                </div>

                <div className="relative text-center bg-white/90 p-3 rounded-2xl border border-stone-200/60 shadow-sm min-w-[72px]">
                  <div className="text-[9px] text-stone-500 font-semibold uppercase tracking-wider">
                    Score
                  </div>
                  <div
                    className={`text-2xl font-black tabular-nums ${
                      activeReport.score >= 70
                        ? "text-violet-700"
                        : activeReport.score >= 50
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {activeReport.score}
                  </div>
                  <TrendingUp
                    size={10}
                    className={`mx-auto ${
                      activeReport.score >= 70
                        ? "text-violet-600"
                        : activeReport.score >= 50
                        ? "text-amber-500"
                        : "text-rose-500"
                    }`}
                  />
                </div>
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-1 gap-2">
                {activeReport.phone && (
                  <div className="flex items-center gap-3 text-xs text-stone-700 bg-white/70 p-3 rounded-xl border border-stone-200/60 hover:bg-white transition">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Phone size={13} className="text-violet-700" />
                    </div>
                    <span className="font-medium">{activeReport.phone}</span>
                  </div>
                )}
                {activeReport.email && (
                  <div className="flex items-center gap-3 text-xs text-stone-700 bg-white/70 p-3 rounded-xl border border-stone-200/60 hover:bg-white transition">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                      <Mail size={13} className="text-sky-700" />
                    </div>
                    <span className="truncate font-medium">{activeReport.email}</span>
                  </div>
                )}
                {activeReport.website && (
                  <a
                    href={activeReport.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs text-stone-700 bg-white/70 p-3 rounded-xl border border-stone-200/60 hover:bg-white hover:border-violet-300 transition group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                        <ExternalLink size={13} className="text-amber-700" />
                      </div>
                      <span className="truncate font-medium">
                        {activeReport.website.replace(/^https?:\/\//, "")}
                      </span>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-stone-400 shrink-0 group-hover:translate-x-0.5 group-hover:text-violet-700 transition"
                    />
                  </a>
                )}
              </div>

              {/* Digital presence */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Info size={11} /> Présence en ligne
                </h4>
                <div className="p-4 bg-white/60 rounded-2xl border border-stone-200/50 text-xs text-stone-700 leading-relaxed">
                  {activeReport.presence_digitale}
                </div>
              </div>

              {/* Analyse */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  Résumé de l&apos;analyse
                </h4>
                <p className="text-xs text-stone-700 leading-relaxed p-4 bg-white/60 rounded-2xl border border-stone-200/50">
                  {activeReport.analyse}
                </p>
              </div>

              {/* Forces / Faiblesses */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="p-4 rounded-2xl space-y-2.5"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(220,252,231,0.6) 0%, rgba(240,253,244,0.4) 100%)",
                    border: "1px solid rgba(134, 239, 172, 0.4)",
                  }}
                >
                  <h4 className="font-bold text-[11px] text-violet-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 size={12} className="text-violet-700" />
                    Forces
                  </h4>
                  <ul className="space-y-1.5">
                    {activeReport.forces?.map((f, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-stone-700 leading-snug flex items-start gap-1.5"
                      >
                        <span className="text-violet-600 font-bold select-none mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="p-4 rounded-2xl space-y-2.5"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(255,228,230,0.5) 0%, rgba(254,242,242,0.4) 100%)",
                    border: "1px solid rgba(252, 165, 165, 0.4)",
                  }}
                >
                  <h4 className="font-bold text-[11px] text-rose-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <XCircle size={12} className="text-rose-600" />
                    À améliorer
                  </h4>
                  <ul className="space-y-1.5">
                    {activeReport.faiblesses?.map((f, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-stone-700 leading-snug flex items-start gap-1.5"
                      >
                        <span className="text-rose-500 font-bold select-none mt-0.5">!</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Argumentaire */}
              <div
                className="relative p-5 rounded-2xl space-y-2 overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #1c1917 0%, #292524 60%, #4c1d95 100%)",
                  boxShadow: "0 12px 28px -12px rgba(28, 25, 23, 0.5)",
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-400/10 blur-2xl rounded-full" />
                <div className="relative flex items-center gap-2">
                  <Sparkles size={12} className="text-amber-400" />
                  <h4 className="font-bold text-[10px] text-amber-300 tracking-widest uppercase">
                    Argumentaire d&apos;approche
                  </h4>
                </div>
                <p className="relative text-xs text-stone-200 leading-relaxed italic">
                  &ldquo;{activeReport.argumentaire}&rdquo;
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200/50 shrink-0 bg-gradient-to-r from-stone-50/50 to-transparent">
              <a
                href={`/rapports/${activeReport._id}`}
                className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98] hover:shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)",
                  boxShadow: "0 8px 20px -8px rgba(28, 25, 23, 0.4)",
                }}
              >
                Accéder au rapport complet
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        )}

        {/* SCRAPING RESULTS PANEL */}
        {activeScrapingResult && !activeReport && (
          <div
            className="w-5/12 rounded-3xl flex flex-col overflow-hidden animate-[slideIn_0.4s_ease-out]"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(252,250,246,0.82))",
              border: "1px solid rgba(120, 113, 108, 0.15)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.9) inset, 0 20px 40px -20px rgba(41, 37, 36, 0.18)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-200/50 flex items-center justify-between shrink-0 bg-gradient-to-r from-stone-50/50 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-md shadow-violet-900/25 ring-1 ring-white/40">
                  <Radar size={15} className="text-violet-50" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                </div>
                <div>
                  <h2 className="font-semibold text-stone-800 text-sm leading-tight">
                    Nouveaux prospects
                  </h2>
                  <p className="text-[10px] text-stone-500 tracking-wider uppercase mt-0.5">
                    Session live · scraping
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveScrapingResult(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition text-xs font-semibold"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
              {/* Hero summary */}
              <div
                className="relative overflow-hidden p-5 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, #1c1917 0%, #292524 55%, #4c1d95 100%)",
                  boxShadow: "0 12px 28px -12px rgba(28, 25, 23, 0.55)",
                }}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-400/15 blur-3xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/10 blur-3xl rounded-full" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={11} className="text-amber-300" />
                      <span className="text-[10px] font-bold text-amber-300 tracking-widest uppercase">
                        Récolte terminée
                      </span>
                    </div>
                    <div className="text-4xl font-black text-white tabular-nums leading-none">
                      {activeScrapingResult.totalFound}
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      entreprises identifiées
                      {activeScrapingResult.category && (
                        <>
                          {" "}dans <span className="text-violet-300 font-semibold">{activeScrapingResult.category}</span>
                        </>
                      )}
                      {activeScrapingResult.postalCode && (
                        <>
                          {" "}· <span className="text-stone-200">{activeScrapingResult.postalCode}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
                    <Database size={17} className="text-violet-200" />
                  </div>
                </div>
              </div>

              {/* Stats trio */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="p-4 rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(220,252,231,0.65) 0%, rgba(240,253,244,0.4) 100%)",
                    border: "1px solid rgba(134, 239, 172, 0.45)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-violet-900 uppercase tracking-widest">
                      Nouveaux
                    </span>
                    <CheckCircle2 size={12} className="text-violet-700" />
                  </div>
                  <div className="text-2xl font-black text-violet-800 tabular-nums mt-1.5">
                    {activeScrapingResult.inserted}
                  </div>
                  <p className="text-[10px] text-violet-800/70 mt-0.5">
                    ajoutés à la base
                  </p>
                </div>
                <div
                  className="p-4 rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(254,243,199,0.6) 0%, rgba(255,251,235,0.4) 100%)",
                    border: "1px solid rgba(252, 211, 77, 0.45)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest">
                      Existants
                    </span>
                    <Layers size={12} className="text-amber-700" />
                  </div>
                  <div className="text-2xl font-black text-amber-800 tabular-nums mt-1.5">
                    {activeScrapingResult.skipped}
                  </div>
                  <p className="text-[10px] text-amber-800/70 mt-0.5">
                    déjà connus
                  </p>
                </div>
              </div>

              {/* Sample list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 size={11} /> Aperçu des prospects
                  </h4>
                  <span className="text-[10px] text-stone-400 tabular-nums">
                    {activeScrapingResult.sample.length} affichés
                  </span>
                </div>

                {activeScrapingResult.sample.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 bg-white/50 rounded-2xl border border-dashed border-stone-300/70">
                    Aucun échantillon disponible.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeScrapingResult.sample.map((p, i) => (
                      <div
                        key={i}
                        className="group relative p-3.5 rounded-2xl bg-white/70 border border-stone-200/60 hover:border-violet-300/70 hover:bg-white transition-all hover:shadow-sm animate-[fadeIn_0.4s_ease-out]"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 border border-stone-200/60 flex items-center justify-center text-[11px] font-black text-stone-600 tabular-nums">
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-semibold text-stone-900 text-[13px] leading-tight truncate">
                                {p.name}
                              </h5>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                              {p.category && (
                                <span className="px-1.5 py-0.5 bg-violet-50 text-violet-800 rounded-md font-medium border border-violet-200/60">
                                  {p.category}
                                </span>
                              )}
                              {p.address?.city && (
                                <span className="flex items-center gap-1 text-stone-500">
                                  <MapPin size={9} />
                                  {p.address.city}
                                </span>
                              )}
                            </div>
                            {(p.phone || p.email) && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[10.5px] text-stone-600">
                                {p.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={10} className="text-violet-600" />
                                    <span className="font-medium">{p.phone}</span>
                                  </span>
                                )}
                                {p.email && (
                                  <span className="flex items-center gap-1 truncate max-w-full">
                                    <Mail size={10} className="text-sky-600" />
                                    <span className="truncate font-medium">{p.email}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-6 py-4 border-t border-stone-200/50 shrink-0 bg-gradient-to-r from-stone-50/50 to-transparent">
              <a
                href={`/scraping/${activeScrapingResult.session_id}`}
                className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98] hover:shadow-lg group"
                style={{
                  background: "linear-gradient(135deg, #6d28d9 0%, #6b21a8 60%, #4c1d95 100%)",
                  boxShadow: "0 8px 20px -8px rgba(6, 95, 70, 0.5)",
                }}
              >
                Voir tous les prospects
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
              <p className="text-[10px] text-center text-stone-400 mt-2 tabular-nums">
                Session <span className="font-mono">{activeScrapingResult.session_id.slice(0, 10)}…</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* HISTORY POPOVER */}
      {showHistory && (
        <>
          <div
            className="fixed inset-0 z-40 bg-stone-900/10 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          />
          <div
            className="fixed right-6 top-24 z-50 w-96 rounded-3xl overflow-hidden animate-[slideIn_0.25s_ease-out]"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(252,250,246,0.95))",
              border: "1px solid rgba(120, 113, 108, 0.2)",
              boxShadow:
                "0 24px 48px -12px rgba(28, 25, 23, 0.25), 0 8px 16px -8px rgba(28, 25, 23, 0.1)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/60">
              <div>
                <p className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <History size={14} className="text-violet-700" />
                  Historique
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {conversations.length} conversation{conversations.length > 1 ? "s" : ""} · {userName}
                </p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition text-xs"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto px-4 py-4">
              {conversations.length === 0 ? (
                <div className="text-center py-10 text-stone-500">
                  <History size={28} className="mx-auto mb-3 text-stone-300" />
                  <p className="text-sm">Aucune conversation sauvegardée.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {conversations.map((conv) => (
                    <li key={conv._id}>
                      <div className="flex items-center gap-2 group">
                        <button
                          onClick={() => loadConversation(conv)}
                          className={`flex-1 text-left rounded-2xl border px-3.5 py-2.5 text-sm transition ${
                            conversationId === conv._id
                              ? "border-violet-300 bg-violet-50/60 text-violet-900"
                              : "border-stone-200/70 bg-white/60 text-stone-700 hover:bg-white hover:border-stone-300"
                          }`}
                        >
                          <div className="font-medium truncate">{conv.title}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            Mis à jour le{" "}
                            {new Date(conv.updatedAt).toLocaleDateString("fr-FR")}
                          </div>
                        </button>
                        <button
                          onClick={() => deleteConversation(conv._id)}
                          title="Supprimer"
                          className="w-9 h-9 flex items-center justify-center text-rose-600 bg-rose-50/40 hover:bg-rose-100 rounded-xl border border-rose-100/60 transition opacity-70 group-hover:opacity-100"
                        >
                          <Trash2 size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* FOOTER */}
      <footer className="relative z-10 text-center py-2.5 text-[10px] text-stone-500 border-t border-stone-200/50 backdrop-blur-md bg-white/30 shrink-0 tracking-wide">
        Données collectées via les registres publics et analysées par l&apos;IA BelgoData · Validez les données critiques avant démarchage.
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(120, 113, 108, 0.25);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover { background: rgba(120, 113, 108, 0.4); }
      `}</style>
    </div>
  );
}

export function RootPage() {
  redirect("/agent");
  return null;
}
