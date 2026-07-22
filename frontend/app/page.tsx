"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import {
  Bot,
  Sparkles,
  Send,
  Plus,
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
  Copy,
  Check,
  History,
  X,
  MessageSquarePlus,
  Flame,
  Snowflake,
  CloudSun,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   TYPES (inchangés)
   ───────────────────────────────────────────────────────────── */
interface Message {
  role: "user" | "agent";
  content: string;
  suggestedActions?: string[];
  timestamp: string;
  report?: Report;
  emailDraft?: EmailDraft;
  prospectsSample?: ScrapedProspect[];
  scrapedCount?: number;
}
interface ScrapedProspect {
  name?: string;
  category?: string;
  address?: { city?: string; postcode?: string; street?: string };
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}
interface ScrapeResults {
  count: number;
  prospects: ScrapedProspect[];
}
interface EmailDraft {
  subject: string;
  body: string;
  prospect_id: string;
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
  temperature?: "chaud" | "tiede" | "froid";
  temperature_reason?: string;
}
interface ConversationSummary {
  _id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const AI_URL = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:5001";

const defaultMessageContent =
  "Je suis votre assistant de prospection intelligent spécialisé sur le marché belge. Voici ce que nous pouvons faire ensemble :\n\n" +
  "✦ Recherche ciblée : Trouvez des entreprises par secteur et code postal.\n" +
  "✦ Analyse de données : Générez des bilans de prospection automatisés.\n" +
  "✦ Suivi intelligent : Je garde en mémoire notre fil de discussion pour affiner les résultats.";

const defaultActions = [
  "Restaurants à 1000 Bruxelles",
  "Cafés à 2000 Anvers",
  "Pharmacies à 5000 Namur",
];

/* ─────────────────────────────────────────────────────────────
   Helpers UI (locaux, purement visuels)
   ───────────────────────────────────────────────────────────── */
function TemperatureBadge({
  temperature,
  reason,
  size = "sm",
}: {
  temperature?: "chaud" | "tiede" | "froid";
  reason?: string;
  size?: "sm" | "md";
}) {
  if (!temperature) return null;
  const map = {
    chaud: {
      label: "Chaud",
      Icon: Flame,
      cls: "bg-indigo-600 text-white",
    },
    tiede: {
      label: "Tiède",
      Icon: CloudSun,
      cls: "bg-indigo-100 text-indigo-700",
    },
    froid: {
      label: "Froid",
      Icon: Snowflake,
      cls: "bg-slate-100 text-slate-600",
    },
  } as const;
  const { label, Icon, cls } = map[temperature];
  const sizes =
    size === "md" ? "text-xs px-2.5 py-1 gap-1.5" : "text-[10px] px-2 py-0.5 gap-1";
  return (
    <span
      title={reason}
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wider ${cls} ${sizes}`}
    >
      <Icon size={size === "md" ? 12 : 10} />
      {label}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "text-indigo-600 bg-indigo-50 border-indigo-200"
      : score >= 50
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-rose-600 bg-rose-50 border-rose-200";
  return (
    <div
      className={`min-w-[60px] rounded-xl border p-2 text-center shadow-sm ${tone}`}
      aria-label={`Score ${score} sur 100`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        Score
      </div>
      <div className="text-xl font-black leading-none mt-0.5">{score}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */
export default function AgentPage() {
  function nowTime() {
    return new Date().toLocaleTimeString("fr-BE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const { user, token } = useAuth();
  const avatarUrl = user?.avatarUrl;
  const canChat = user ? user.role !== "Viewer" : false;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [activeScrapeResults, setActiveScrapeResults] =
    useState<ScrapeResults | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const userName = user?.name || "Utilisateur";
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 18 ? "Bonsoir" : "Bonjour";
  });

  const getAuthConfig = useCallback(() => {
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, [token]);

  /* ── Chargement conversations (inchangé) ── */
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(
        `${API_URL}/api/conversations`,
        getAuthConfig(),
      );
      const data: ConversationSummary[] = res.data || [];
      setConversations(data);
      if (data.length > 0) {
        const conv = data[0];
        setConversationId(conv._id);
        if (conv.messages && conv.messages.length > 0) {
          setMessages(conv.messages);
          localStorage.setItem(
            "agent_chat_history",
            JSON.stringify(conv.messages),
          );
        }
      } else {
        const title = `Conversation IA - ${new Date().toLocaleDateString("fr-FR")}`;
        const createRes = await axios.post(
          `${API_URL}/api/conversations`,
          { title, messages: [] },
          getAuthConfig(),
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
        getAuthConfig(),
      );
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId
            ? { ...conv, messages: updatedMessages }
            : conv,
        ),
      );
    } catch (error) {
      console.error("Erreur sauvegarde conversation :", error);
    }
  };

  const createConversation = async () => {
    if (!token) return null;
    try {
      const title = `Conversation IA - ${new Date().toLocaleDateString("fr-FR")}`;
      const createRes = await axios.post(
        `${API_URL}/api/conversations`,
        { title, messages: [] },
        getAuthConfig(),
      );
      const newConversation: ConversationSummary = createRes.data;
      setConversationId(newConversation._id);
      setConversations((prev) => [newConversation, ...prev]);
      return newConversation._id;
    } catch (error) {
      console.error("Erreur création conversation :", error);
      return null;
    }
  };

  const loadConversation = (conv: ConversationSummary) => {
    setConversationId(conv._id);
    setMessages(conv.messages || []);
    setShowHistory(false);
    localStorage.setItem(
      "agent_chat_history",
      JSON.stringify(conv.messages || []),
    );
  };

  const deleteConversation = async (id: string) => {
    if (!token) return;
    if (!confirm("Confirmer la suppression de cette conversation ?")) return;
    try {
      await axios.delete(
        `${API_URL}/api/conversations/${id}`,
        getAuthConfig(),
      );
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
      }
    } catch (error) {
      console.error("Erreur suppression conversation:", error);
    }
  };

  /* ── Effects (inchangés) ── */
  useEffect(() => {
    const loadChatHistory = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("agent_chat_history");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
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
    loadConversations();
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

  // Auto-focus du composeur
  useEffect(() => {
    if (mounted && canChat) textareaRef.current?.focus();
  }, [mounted, canChat, conversationId]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  /* ── Envoi message (inchangé fonctionnellement) ── */
  async function sendMessage(text: string) {
    if (!canChat) {
      alert(
        "Vous n'avez pas l'accès pour discuter avec le chat. Contactez l'administrateur.",
      );
      return;
    }
    if (!text.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: nowTime(),
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${AI_URL}/agent/chat`, {
        message: text,
        history: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        userId: user?.id,
        userName: user?.name,
      });

      const agentMessage: Message = {
        role: "agent",
        content: res.data?.response ?? "Je n'ai pas pu obtenir de réponse.",
        timestamp: nowTime(),
        suggestedActions: res.data?.suggested_actions,
        report: res.data?.report,
        emailDraft: res.data?.email_draft,
        prospectsSample: res.data?.prospects_sample,
        scrapedCount: res.data?.scraped_count,
      };

      const finalMessages = [...updatedMessages, agentMessage];
      setMessages(finalMessages);

      if (res.data?.report) {
        setActiveReport(res.data.report);
        setActiveScrapeResults(null);
      } else if (res.data?.prospects_sample?.length > 0) {
        setActiveScrapeResults({
          count: res.data.scraped_count ?? res.data.prospects_sample.length,
          prospects: res.data.prospects_sample,
        });
        setActiveReport(null);
      }

      await saveConversation(finalMessages);
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
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey || true)) {
      // Enter simple = envoyer / Shift+Enter = nouvelle ligne
      if (!e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    }
  }

  async function resetConversation() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("agent_chat_history");
    }
    const newConversationId = await createConversation();
    setMessages([
      {
        role: "agent",
        content: defaultMessageContent,
        suggestedActions: defaultActions,
        timestamp: nowTime(),
      },
    ]);
    setActiveReport(null);
    if (!newConversationId) setConversationId(null);
  }

  async function copyMessage(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (e) {
      console.error(e);
    }
  }

  const lastMessage = messages[messages.length - 1];
  const currentSuggestions =
    lastMessage?.role === "agent" ? lastMessage.suggestedActions : [];
  const isEmpty = useMemo(
    () =>
      messages.length <= 1 &&
      (messages[0]?.content === defaultMessageContent || messages.length === 0),
    [messages],
  );

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen bg-[#f7f6fb] flex font-sans overflow-hidden text-slate-800 antialiased">
      {/* ══ SIDEBAR CONVERSATIONS ══ */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-slate-200/70 bg-white transition-all duration-300 ${
          showHistory ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <History size={15} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                Historique
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                {conversations.length} conversation
                {conversations.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(false)}
            aria-label="Fermer l'historique"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-3 pt-3">
          <button
            onClick={resetConversation}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl shadow-sm shadow-indigo-600/20 transition active:scale-[0.98]"
          >
            <MessageSquarePlus size={15} />
            Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 px-4">
              Vos conversations apparaîtront ici.
            </p>
          ) : (
            conversations.map((conv) => {
              const isActive = conv._id === conversationId;
              return (
                <div
                  key={conv._id}
                  className={`group rounded-xl border transition-all ${
                    isActive
                      ? "bg-indigo-50 border-indigo-200"
                      : "bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1 px-2 py-2">
                    <button
                      onClick={() => loadConversation(conv)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div
                        className={`text-sm font-semibold truncate ${
                          isActive ? "text-indigo-700" : "text-slate-700"
                        }`}
                      >
                        {conv.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {new Date(conv.updatedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteConversation(conv._id)}
                      aria-label="Supprimer la conversation"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ══ COLONNE PRINCIPALE ══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="bg-white/80 backdrop-blur border-b border-slate-200/70 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {!showHistory && (
              <button
                onClick={() => setShowHistory(true)}
                aria-label="Ouvrir l'historique"
                className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 transition shrink-0"
              >
                <History size={16} />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar utilisateur"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 text-sm font-bold">
                  {user?.name?.slice(0, 2).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold tracking-tight text-slate-900 truncate">
                {greeting}, {userName}
              </h1>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Assistant IA connecté à{" "}
                <span className="font-semibold text-indigo-600">BelgoData</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={resetConversation}
              className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition active:scale-95"
            >
              <Plus size={14} />
              Nouvelle session
            </button>
          </div>
        </header>

        {/* BANNIÈRE VIEWER */}
        {user?.role === "Viewer" && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-amber-800 text-xs font-medium flex items-center gap-2">
            <Info size={14} />
            Vous n&apos;avez pas l&apos;accès pour discuter avec le chat.
            Contactez l&apos;administrateur.
          </div>
        )}

        {/* ZONE DE TRAVAIL */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* ── COLONNE CHAT ── */}
          <div
            className={`bg-white border border-slate-200/70 rounded-2xl flex flex-col shadow-sm overflow-hidden transition-all duration-300 ${
              activeReport || activeScrapeResults ? "w-7/12" : "w-full"
            }`}
          >
            {/* Fil de discussion */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5 scroll-smooth"
            >
              {/* Empty state riche */}
              {isEmpty && (
                <div className="max-w-2xl mx-auto text-center py-10 space-y-6 animate-[fadeIn_.4s_ease-out]">
                  <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <Bot size={26} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Prêt à prospecter ?
                    </h2>
                    <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed whitespace-pre-line">
                      {defaultMessageContent}
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 pt-2">
                    {defaultActions.map((a) => (
                      <button
                        key={a}
                        onClick={() => sendMessage(a)}
                        disabled={!canChat}
                        className="text-left text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 p-3 rounded-xl transition group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles
                          size={13}
                          className="text-indigo-500 mb-1.5 group-hover:scale-110 transition"
                        />
                        <div className="font-semibold text-slate-700 leading-snug">
                          {a}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {!isEmpty &&
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`group flex gap-3 animate-[fadeIn_.25s_ease-out] ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "agent" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                        <Bot size={15} />
                      </div>
                    )}

                    <div
                      className={`max-w-[78%] flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-2.5 text-[14px] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-2xl rounded-tr-md font-medium shadow-sm"
                            : "text-slate-800 whitespace-pre-line"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Actions contextuelles sur la bulle */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {msg.report && (
                          <button
                            onClick={() => setActiveReport(msg.report!)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-700 font-semibold hover:bg-indigo-100 transition"
                          >
                            <Building2 size={12} />
                            Bilan de {msg.report.name}
                            <TemperatureBadge
                              temperature={msg.report.temperature}
                            />
                          </button>
                        )}

                        {msg.emailDraft && (
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(
                                `Objet : ${msg.emailDraft!.subject}\n\n${msg.emailDraft!.body}`,
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-700 font-semibold hover:bg-indigo-100 transition"
                          >
                            <FileText size={12} />
                            Copier l&apos;email
                          </button>
                        )}

                        {msg.prospectsSample &&
                          msg.prospectsSample.length > 0 && (
                            <button
                              onClick={() =>
                                setActiveScrapeResults({
                                  count:
                                    msg.scrapedCount ??
                                    msg.prospectsSample!.length,
                                  prospects: msg.prospectsSample!,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-700 font-semibold hover:bg-indigo-100 transition"
                            >
                              <Building2 size={12} />
                              {msg.prospectsSample.length} résultat
                              {msg.prospectsSample.length > 1 ? "s" : ""}
                            </button>
                          )}
                      </div>

                      <div
                        className={`flex items-center gap-2 mt-1 px-1 ${
                          msg.role === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <span className="text-[10px] text-slate-400">
                          {msg.timestamp}
                        </span>
                        {msg.role === "agent" && (
                          <button
                            onClick={() => copyMessage(msg.content, i)}
                            aria-label="Copier le message"
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition"
                          >
                            {copiedIndex === i ? (
                              <Check size={12} />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shrink-0 mt-0.5 relative bg-slate-100">
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt="Avatar utilisateur"
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 text-[10px] font-bold">
                            {user?.name?.slice(0, 2).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

              {/* Shimmer typing */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={15} />
                  </div>
                  <div className="pt-2">
                    <span className="text-sm font-medium bg-gradient-to-r from-slate-400 via-indigo-500 to-slate-400 bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_1.8s_linear_infinite]">
                      Analyse des données belges…
                    </span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* ── COMPOSEUR ── */}
            <div className="border-t border-slate-100 bg-white px-4 md:px-6 py-3 space-y-3 shrink-0">
              {canChat &&
                currentSuggestions &&
                currentSuggestions.length > 0 &&
                !loading &&
                !isEmpty && (
                  <div className="flex flex-wrap gap-2">
                    {currentSuggestions.map((action) => (
                      <button
                        key={action}
                        onClick={() => sendMessage(action)}
                        className="text-xs bg-white border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-50 hover:border-indigo-300 transition font-medium flex items-center gap-1.5"
                      >
                        <Sparkles size={11} />
                        {action}
                      </button>
                    ))}
                  </div>
                )}

              {canChat ? (
                <form
                  onSubmit={handleSubmit}
                  className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition"
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex : Boulangeries à 4000 Liège…"
                    rows={1}
                    disabled={loading}
                    className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none max-h-[200px] leading-relaxed"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    aria-label="Envoyer le message"
                    title="Envoyer (Entrée) · Nouvelle ligne (Maj+Entrée)"
                    className="h-9 w-9 shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm shadow-indigo-600/20 active:scale-95"
                  >
                    <Send size={15} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600">
                  <Info size={14} className="text-slate-400" />
                  Vous n&apos;avez pas l&apos;accès pour discuter avec le chat.
                  Contactez l&apos;administrateur.
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center">
                Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
              </p>
            </div>
          </div>

          {/* ══ PANNEAU BILAN ══ */}
          {activeReport && (
            <div className="w-5/12 bg-white border border-slate-200/70 rounded-2xl flex flex-col shadow-sm overflow-hidden animate-[slideIn_.3s_ease-out]">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText size={14} />
                  </div>
                  <h2 className="font-bold text-slate-800 text-sm">
                    Fiche prospect qualifiée
                  </h2>
                </div>
                <button
                  onClick={() => setActiveReport(null)}
                  aria-label="Fermer le panneau"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {activeReport.category || "Secteur"}
                      </span>
                      <TemperatureBadge
                        temperature={activeReport.temperature}
                        reason={activeReport.temperature_reason}
                        size="md"
                      />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      {activeReport.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400" />
                      {activeReport.address?.street},{" "}
                      {activeReport.address?.postcode}{" "}
                      {activeReport.address?.city}
                    </p>
                  </div>
                  <ScoreRing score={activeReport.score} />
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {activeReport.phone && (
                    <a
                      href={`tel:${activeReport.phone}`}
                      className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50 hover:bg-indigo-50 p-2.5 rounded-lg border border-slate-100 hover:border-indigo-200 transition"
                    >
                      <Phone size={13} className="text-indigo-500" />
                      <span>{activeReport.phone}</span>
                    </a>
                  )}
                  {activeReport.email && (
                    <a
                      href={`mailto:${activeReport.email}`}
                      className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50 hover:bg-indigo-50 p-2.5 rounded-lg border border-slate-100 hover:border-indigo-200 transition"
                    >
                      <Mail size={13} className="text-indigo-500" />
                      <span className="truncate">{activeReport.email}</span>
                    </a>
                  )}
                  {activeReport.website && (
                    <a
                      href={activeReport.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-xs text-indigo-700 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <ExternalLink size={13} />
                        <span className="truncate font-semibold">
                          {activeReport.website.replace(/^https?:\/\//, "")}
                        </span>
                      </div>
                      <ChevronRight size={13} />
                    </a>
                  )}
                </div>

                <section className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info size={11} /> Présence en ligne
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    {activeReport.presence_digitale}
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Résumé de l&apos;analyse
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeReport.analyse}
                  </p>
                </section>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-lg space-y-1.5">
                    <h4 className="font-bold text-[11px] text-indigo-800 flex items-center gap-1.5">
                      <CheckCircle2 size={12} />
                      Points forts
                    </h4>
                    <ul className="space-y-1">
                      {activeReport.forces?.map((f, i) => (
                        <li
                          key={i}
                          className="text-[11px] text-slate-700 leading-snug flex gap-1.5"
                        >
                          <span className="text-indigo-500 font-bold select-none">
                            ›
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1.5">
                    <h4 className="font-bold text-[11px] text-slate-700 flex items-center gap-1.5">
                      <XCircle size={12} />
                      Axes d&apos;amélioration
                    </h4>
                    <ul className="space-y-1">
                      {activeReport.faiblesses?.map((f, i) => (
                        <li
                          key={i}
                          className="text-[11px] text-slate-600 leading-snug flex gap-1.5"
                        >
                          <span className="text-slate-400 font-bold select-none">
                            ›
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-950 to-indigo-800 text-slate-100 p-4 rounded-xl space-y-2 shadow-md">
                  <h4 className="font-bold text-[10px] text-indigo-300 tracking-widest uppercase">
                    Argumentaire d&apos;approche
                  </h4>
                  <p className="text-xs text-indigo-50 leading-relaxed italic">
                    “{activeReport.argumentaire}”
                  </p>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-100 shrink-0">
                <a
                  href={`/rapports/${activeReport._id}`}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/20 transition active:scale-[0.98]"
                >
                  Rapport d&apos;analyse complet
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>
          )}

          {/* ══ PANNEAU SCRAPING ══ */}
          {!activeReport && activeScrapeResults && (
            <div className="w-5/12 bg-white border border-slate-200/70 rounded-2xl flex flex-col shadow-sm overflow-hidden animate-[slideIn_.3s_ease-out]">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Building2 size={14} />
                  </div>
                  <h2 className="font-bold text-slate-800 text-sm">
                    Résultats du scraping
                  </h2>
                </div>
                <button
                  onClick={() => setActiveScrapeResults(null)}
                  aria-label="Fermer le panneau"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-indigo-50/50 border border-indigo-100 rounded-lg px-3 py-2">
                  <Sparkles size={13} className="text-indigo-500" />
                  <span>
                    <strong className="text-indigo-700">
                      {activeScrapeResults.count}
                    </strong>{" "}
                    profil
                    {activeScrapeResults.count > 1 ? "s" : ""} ajouté
                    {activeScrapeResults.count > 1 ? "s" : ""} — aperçu des{" "}
                    {activeScrapeResults.prospects.length} premiers
                  </span>
                </div>

                {activeScrapeResults.prospects.map((p, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition space-y-1.5 bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        {p.name || "Nom inconnu"}
                      </h3>
                      {p.category && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                          {p.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-start gap-1.5">
                      <MapPin
                        size={12}
                        className="text-slate-400 mt-0.5 shrink-0"
                      />
                      {[
                        p.address?.street,
                        p.address?.postcode,
                        p.address?.city,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Adresse non renseignée"}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-500">
                      {p.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={10} /> {p.phone}
                        </span>
                      )}
                      {p.email && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                          <Mail size={10} /> {p.email}
                        </span>
                      )}
                      {p.website && (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                          <ExternalLink size={10} /> Site
                        </a>
                      )}
                      {!p.phone && !p.email && !p.website && (
                        <span className="italic text-slate-400">
                          Aucune coordonnée
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 border-t border-slate-100 shrink-0">
                <a
                  href="/prospects"
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/20 transition active:scale-[0.98]"
                >
                  Voir tous les prospects
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="text-center py-2 text-[10px] text-slate-400 bg-white border-t border-slate-200/60 shrink-0">
          Données collectées via les registres publics et analysées par
          l&apos;IA BelgoData. Validez les données critiques avant démarchage.
        </footer>
      </div>

      {/* Animations locales (à ajouter dans tailwind.config si absentes) */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

export function RootPage() {
  redirect("/agent");
  return null;
}
