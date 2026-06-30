"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import axios from "axios";
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

const AI_URL = process.env.NEXT_PUBLIC_AI_URL;

export default function Home() {
  function nowTime() {
    return new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [userName] = useState("Mohamed Ali");
  const [greeting, setGreeting] = useState("Bonjour");
  
  // 🎯 États ajustés pour contrer le comportement SSR de Next.js
  const [showSplash, setShowSplash] = useState(false); 
  const [fadeSplash, setFadeSplash] = useState(false);

  // 1. Premier useEffect : S'exécute uniquement sur le client après le rendu initial
  useEffect(() => {
    setMounted(true);
    
    const hour = new Date().getHours();
    setGreeting(hour >= 18 ? "Bonsoir" : "Bonjour");

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agent_chat_history");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setShowSplash(false); // Historique trouvé -> Pas de splash screen
            return;
          }
        } catch (e) {
          console.error("Erreur historique:", e);
        }
      }
      
      // Si aucun historique n'est trouvé, c'est le premier lancement !
      setShowSplash(true);
    }
  }, []);

  // 2. Deuxième useEffect : Gère les animations de disparition du splash screen s'il s'affiche
  useEffect(() => {
    if (showSplash) {
      const fadeTimeout = setTimeout(() => {
        setFadeSplash(true);
      }, 2500);

      const removeTimeout = setTimeout(() => {
        setShowSplash(false);
      }, 3000);

      return () => {
        clearTimeout(fadeTimeout);
        clearTimeout(removeTimeout);
      };
    }
  }, [showSplash]);

  // Sauvegarde automatique de l'historique lors des nouveaux messages
  useEffect(() => {
    if (mounted && typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("agent_chat_history", JSON.stringify(messages));
    }
  }, [messages, mounted]);

  // Auto-scroll
  useEffect(() => {
    if (mounted) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mounted]);

  async function sendMessage(text: string) {
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
      });

      const agentMessage: Message = {
        role: "agent",
        content: res.data?.response ?? "Je n'ai pas pu obtenir de réponse.",
        timestamp: nowTime(),
        suggestedActions: res.data?.suggested_actions,
        report: res.data?.report,
      };

      setMessages((prev) => [...prev, agentMessage]);

      if (res.data?.report) {
        setActiveReport(res.data.report);
      }
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function resetConversation() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("agent_chat_history");
    }
    setMessages([]);
    setActiveReport(null);
    // Optionnel : Réaffiche le splash screen si tu réinitialises manuellement
    setShowSplash(true);
    setFadeSplash(false);
  }

  // Sécurité pour éviter les bugs visuels d'hydratation Next.js
  if (!mounted) {
    return <div className="h-screen bg-slate-50" />;
  }

  const lastMessage = messages[messages.length - 1];
  const currentSuggestions = lastMessage?.role === "agent" ? lastMessage.suggestedActions : [];

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden relative">
      
      {/* ÉCRAN D'ACCUEIL PLEIN ÉCRAN */}
      {showSplash && (
        <div 
          className={`absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center transition-all duration-500 ease-in-out ${
            fadeSplash ? "opacity-0 scale-105 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="max-w-3xl space-y-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo1.png"
                alt="logo BelgoData"
                width={120}
                height={24}
                priority
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-600 bg-clip-text text-transparent">
                {greeting}, {userName}.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 font-medium max-w-xl mx-auto">
              Comment <span className="text-indigo-600 font-bold">BelgoData</span> peut-il vous aider aujourd'hui ?
            </p>
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Image
            src="/logo1.png"
            alt="logo BelgoData"
            width={90}
            height={18}
            priority
          />
          <div className="h-5 w-[1px] bg-slate-200" />
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
                {greeting}, {userName}
              </span>
              <Sparkles size={14} className="text-indigo-500" />
            </h1>
          </div>
        </div>
        
        <button
          onClick={resetConversation}
          className="flex items-center gap-2 text-xs font-medium border border-slate-200 bg-white text-slate-600 px-3.5 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-all active:scale-95"
        >
          <RefreshCw size={14} />
          Nouvelle session
        </button>
      </header>

      {/* ZONE DE TRAVAIL */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* COLONNE CHAT */}
        <div className={`bg-white border border-slate-200/80 rounded-2xl flex flex-col shadow-sm overflow-hidden transition-all duration-300 ${activeReport ? "w-7/12" : "w-full"}`}>
          
          {/* Fil de discussion */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-b from-slate-50/50 to-white">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 animate-fade-in">
                <Bot size={32} className="text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-medium">Le fil de discussion est vide.</p>
                <p className="text-xs text-slate-400 max-w-xs text-center">Posez votre première question ci-dessous pour lancer la recherche.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  
                  {msg.role === "agent" && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                      <Bot size={16} />
                    </div>
                  )}

                  <div className={`max-w-[78%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none font-medium"
                          : "bg-white border border-slate-100 text-slate-800 rounded-tl-none whitespace-pre-line"
                      }`}
                    >
                      {msg.content}
                    </div>

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

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shadow-sm shrink-0 mt-0.5">
                      <User size={16} />
                    </div>
                  )}
                </div>
              ))
            )}

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

          {/* ZONE ACTIONS & FORMULAIRE */}
          <div className="border-t border-slate-100 bg-white p-4 space-y-4 shrink-0">
            {currentSuggestions && currentSuggestions.length > 0 && !loading && (
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
          </div>
        </div>

        {/* PANNEAU LATÉRAL MODERNE (BILAN) */}
        {activeReport && (
          <div className="w-5/12 bg-white border border-slate-200/80 rounded-2xl flex flex-col shadow-sm overflow-hidden animate-fade-in">
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

            {/* Zone de contenu défilante améliorée */}
            <div className="flex-1 overflow-y-auto scroll-smooth overscroll-contain p-6 space-y-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              
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
                
                <div className="text-center bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm min-w-[65px]">
                  <div className="text-xs text-slate-400 font-medium">Score</div>
                  <div className={`text-xl font-black ${
                    activeReport.score >= 70 ? "text-emerald-600" : activeReport.score >= 50 ? "text-amber-500" : "text-rose-500"
                  }`}>
                    {activeReport.score}
                  </div>
                </div>
              </div>

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

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={12} /> Présence en ligne
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/50 text-xs text-slate-700 leading-relaxed font-medium">
                  {activeReport.presence_digitale}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Résumé de l'analyse</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-white">{activeReport.analyse}</p>
              </div>

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
                    Axes d'amélioration
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

              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 shadow-sm">
                <h4 className="font-bold text-xs text-indigo-400 tracking-wide uppercase">Argumentaire d'approche conseillé</h4>
                <p className="text-xs text-slate-300 leading-relaxed italic">"{activeReport.argumentaire}"</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <a
                href={`/rapports/${activeReport._id}`}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98]"
              >
                Accéder au rapport d'analyse complet
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-2 text-[10px] text-slate-400 bg-white border-t border-slate-200/60 shrink-0">
        Données collectées via les registres publics et analysées par l'IA BelgoData. Validez les données critiques avant démarchage.
      </footer>
    </div>
  );
}