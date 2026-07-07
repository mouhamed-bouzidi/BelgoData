"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Info 
} from "lucide-react";

interface Message {
  role: "user" | "agent";
  content: string;
  suggestedActions?: string[];
  timestamp: string;
  report?: Report; 
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

export default function AgentPage() {
  function nowTime() {
    return new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  }

  const { user, token } = useAuth();
  const canChat = user ? user.role !== "Viewer" : false;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userName = user?.name || "Utilisateur";
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 18 ? "Bonsoir" : "Bonjour";
  });

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

      const agentMessage: Message = {
        role: "agent",
        content: res.data?.response ?? "Je n'ai pas pu obtenir de réponse.",
        timestamp: nowTime(),
        suggestedActions: res.data?.suggested_actions,
        report: res.data?.report,
      };

      const finalMessages = [...updatedMessages, agentMessage];
      setMessages(finalMessages);

      if (res.data?.report) {
        setActiveReport(res.data.report);
      }

      await saveConversation(finalMessages);
    } catch (error) {
      console.error("Erreur agent:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: "Désolé, un problème de connexion est survenu avec le service IA. Vérifiez que votre backend est actif.",
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

  function resetConversation() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("agent_chat_history");
    }
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

  // Extrait les dernières actions suggérées du flux pour les afficher proprement en bas
  const lastMessage = messages[messages.length - 1];
  const currentSuggestions = lastMessage?.role === "agent" ? lastMessage.suggestedActions : [];

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-600 bg-clip-text text-transparent">
              {greeting}, {userName}
            </span>
            <Sparkles size={20} className="text-indigo-500 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Assistant IA connecté à <span className="font-semibold text-indigo-600">BelgoData</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="text-xs font-semibold text-indigo-600 border border-indigo-100 bg-white px-3 py-2 rounded-xl shadow-sm hover:bg-indigo-50 transition"
          >
            Historique
          </button>
          <button
            onClick={resetConversation}
            className="flex items-center gap-2 text-xs font-medium border border-slate-200 bg-white text-slate-600 px-3.5 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw size={14} />
            Nouvelle session
          </button>
        </div>
      </header>

      {/* ZONE DE TRAVAIL (2 Colonnes) */}
      {user?.role === "Viewer" && (
        <div className="px-8 py-3 bg-rose-50 border-b border-rose-100 text-rose-800 text-sm">
          Vous n&apos;avez pas l&apos;accès pour discuter avec le chat. Contactez l&apos;administrateur.
        </div>
      )}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 relative">
        
        {/* COLONNE CHAT */}
        <div className={`bg-white border border-slate-200/80 rounded-2xl flex flex-col shadow-sm overflow-hidden transition-all duration-300 ${activeReport ? "w-7/12" : "w-full"}`}>
          
          {/* Fil de discussion */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-b from-slate-50/50 to-white">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                
                {/* Avatar Agent */}
                {msg.role === "agent" && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`max-w-[78%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  {/* Bulle de texte */}
                  <div
                    className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none font-medium"
                        : "bg-white border border-slate-100 text-slate-800 rounded-tl-none whitespace-pre-line"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Bouton de rappel de rapport contextuel */}
                  {msg.report && (
                    <button
                      onClick={() => setActiveReport(msg.report!)}
                      className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-600 font-medium hover:bg-indigo-100/70 transition-colors"
                    >
                      <Building2 size={13} />
                      Ouvrir le bilan de {msg.report.name}
                    </button>
                  )}

                  <span className="text-[10px] text-slate-400 mt-1.5 px-1">{msg.timestamp}</span>
                </div>

                {/* Avatar User */}
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shadow-sm shrink-0 mt-0.5">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {/* Indicateur de chargement */}
            {loading && (
              <div className="flex gap-4 justify-start animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-slate-100 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-slate-500 font-medium flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  Analyse des données belges...
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* ZONE ACTIONS & FORMULAIRE BAS DE PAGE */}
          <div className="border-t border-slate-100 bg-white p-4 space-y-4 shrink-0">
            
            {/* Puces d'actions suggérées dynamiques */}
            {canChat && currentSuggestions && currentSuggestions.length > 0 && !loading && (
              <div className="flex flex-wrap gap-2 px-1">
                {currentSuggestions.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles size={12} className="text-indigo-500" />
                    {action}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            {canChat ? (
              <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Demandez une recherche (ex: Électriciens à Namur 5000)..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-md shadow-indigo-600/10 active:scale-95 shrink-0 flex items-center justify-center"
                >
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600">
                <div>Vous n&pos;avez pas l&apos;accès pour discuter avec le chat. Contactez l&apos;administrateur.</div>
              </div>
            )}
          </div>
        </div>

        {/* PANNEAU LATÉRAL MODERNE (BILAN) */}
        {activeReport && (
          <div className="w-5/12 bg-white border border-slate-200/80 rounded-2xl flex flex-col shadow-sm overflow-hidden animate-fade-in">
            
            {/* Header du panneau */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                <h2 className="font-bold text-slate-800 text-sm">Fiche Prospect Qualifiée</h2>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Contenu défilant */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Carte Identité Majeure */}
              <div className="flex items-start justify-between bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 rounded-xl border border-slate-200/40">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {activeReport.category || "Secteur non défini"}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight pt-1">{activeReport.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin size={12} className="text-slate-400" />
                    {activeReport.address?.street}, {activeReport.address?.postcode} {activeReport.address?.city}
                  </p>
                </div>
                
                {/* Score badge haut niveau */}
                <div className="text-center bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm min-w-[65px]">
                  <div className="text-xs text-slate-400 font-medium">Score</div>
                  <div className={`text-xl font-black ${
                    activeReport.score >= 70 ? "text-emerald-600" : activeReport.score >= 50 ? "text-amber-500" : "text-rose-500"
                  }`}>
                    {activeReport.score}
                  </div>
                </div>
              </div>

              {/* Grid Contacts rapides */}
              <div className="grid grid-cols-1 gap-2">
                {activeReport.phone && (
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <Phone size={14} className="text-slate-400" />
                    <span>{activeReport.phone}</span>
                  </div>
                )}
                {activeReport.email && (
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">{activeReport.email}</span>
                  </div>
                )}
                {activeReport.website && (
                  <a
                    href={activeReport.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs text-indigo-600 bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100/40 hover:bg-indigo-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <ExternalLink size={14} className="text-indigo-400" />
                      <span className="truncate font-medium">{activeReport.website.replace(/^https?:\/\//, "")}</span>
                    </div>
                    <ChevronRight size={14} className="text-indigo-400 shrink-0" />
                  </a>
                )}
              </div>

              {/* Diagnostic Digital */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={12} /> Présence en ligne
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/50 text-xs text-slate-700 leading-relaxed font-medium">
                  {activeReport.presence_digitale}
                </div>
              </div>

              {/* Analyse descriptive */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Résumé de l&apos;analyse</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-white">{activeReport.analyse}</p>
              </div>

              {/* Matrice Forces & Faiblesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/40 border border-emerald-100/70 p-3.5 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Points forts
                  </h4>
                  <ul className="space-y-1.5">
                    {activeReport.forces?.map((f, i) => (
                      <li key={i} className="text-[11px] text-slate-600 leading-tight flex items-start gap-1">
                        <span className="text-emerald-500 font-bold select-none">•</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-rose-50/40 border border-rose-100/70 p-3.5 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
                    <XCircle size={13} className="text-rose-500" />
                    Axes d&apos;amélioration
                  </h4>
                  <ul className="space-y-1.5">
                    {activeReport.faiblesses?.map((f, i) => (
                      <li key={i} className="text-[11px] text-slate-600 leading-tight flex items-start gap-1">
                        <span className="text-rose-400 font-bold select-none">•</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Pitch commercial personnalisé */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 shadow-sm">
                <h4 className="font-bold text-xs text-indigo-400 tracking-wide uppercase">Argumentaire d&apos;approche conseillé</h4>
                <p className="text-xs text-slate-300 leading-relaxed italic">&quot;{activeReport.argumentaire}&quot;</p>
              </div>
            </div>

            {/* Lien d'ouverture global */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <a
                href={`/rapports/${activeReport._id}`}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98]"
              >
                Accéder au rapport d&apos;analyse complet
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        )}
      </div>

      {showHistory && (
        <div className="absolute right-6 top-28 z-50 w-80 rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-900">Historique des conversations</p>
              <p className="text-xs text-slate-500">Chargé pour {userName}</p>
            </div>
            <button onClick={() => setShowHistory(false)} className="text-xs text-slate-500 hover:text-slate-900">Fermer</button>
          </div>
          <div className="max-h-80 overflow-y-auto px-4 py-3">
            {conversations.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune conversation sauvegardée.</p>
            ) : (
              <ul className="space-y-2">
                {conversations.map((conv) => (
                  <li key={conv._id}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => loadConversation(conv)}
                        className="flex-1 text-left rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        <div className="font-semibold">{conv.title}</div>
                        <div className="text-xs text-slate-400">Mis à jour le {new Date(conv.updatedAt).toLocaleDateString("fr-FR")}</div>
                      </button>

                      <button
                        onClick={() => deleteConversation(conv._id)}
                        title="Supprimer"
                        className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50/40 hover:bg-rose-100 px-2 py-1 rounded-md border border-rose-100"
                      >
                        <Trash2 size={16} strokeWidth={1.8} />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* FOOTER DISCRET */}
      <footer className="text-center py-2 text-[10px] text-slate-400 bg-white border-t border-slate-200/60 shrink-0">
        Données collectées via les registres publics et analysées par l&apos;IA BelgoData. Validez les données critiques avant démarchage.
      </footer>
    </div>
  );
}

export function RootPage() {
  redirect("/agent");
  return null;
}