"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Bot, Sparkles, Send } from "lucide-react";

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
const defaultMessageContent = 
  "👋 Bonjour ! Je suis votre assistant de prospection intelligent. Je peux :\n\n" +
  "✓ Chercher des entreprises dans toute la Belgique\n" +
  "✓ Mémoriser notre conversation\n" +
  "✓ Supporter tous les codes postaux belges\n" +
  "✓ Vous suggérer des actions\n\n" +
  "Exemples de ce que vous pouvez demander :\n" +
  "• \"Trouve-moi des restaurants à 1000 Bruxelles\"\n" +
  "• \"Montre-moi les cafés à 2000 Anvers\"\n" +
  "• \"Cherche des pharmacies à Liège\"\n" +
  "• \"Liste tous les prospects en base\"";

const defaultActions = [
  "Restaurants à 1000 Bruxelles",
  "Cafés à 2000 Anvers",
  "Pharmacies à 5000 Namur",
];

export default function AgentPage() {
  function nowTime() {
    return new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  }

  // Initialisation à vide pour éviter l'écart de contenu SSR vs Client
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Évite les conflits d'hydratation (Hydration Mismatch) au montage initial
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
            console.error("Erreur lors du chargement de l'historique:", e);
          }
        }
      }
      // Si aucun historique n'existe, on injecte le message par défaut AVEC le temps local du client
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

  // Sauvegarder l'historique dans localStorage
  useEffect(() => {
    if (mounted && typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("agent_chat_history", JSON.stringify(messages));
    }
  }, [messages, mounted]);

  // Auto-scroll vers le dernier message
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
        content: "Désolé, une erreur est survenue. Vérifiez que le service IA est bien démarré.",
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
    setMessages([
      {
        role: "agent",
        content: defaultMessageContent,
        suggestedActions: defaultActions,
        timestamp: nowTime(),
      },
    ]);
  }

  return (
  <div className="p-8 h-screen flex flex-col">
    {/* Header */}
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        Agent IA <Sparkles size={20} className="text-accent" />
      </h1>
      <p className="text-sm text-gray-500">Votre assistant de prospection intelligent</p>
    </div>

    {/* Composition à 2 colonnes : chat à gauche, bilan à droite */}
    <div className="flex-1 flex gap-4 overflow-hidden">
      {/* COLONNE GAUCHE — Chat */}
      <div className={`bg-card-bg border border-border-color rounded-xl flex flex-col overflow-hidden transition-all ${activeReport ? "w-1/2" : "w-full"}`}>
        {/* Chat header */}
        <div className="px-5 py-4 border-b border-border-color flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white">
              <Bot size={18} />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Agent IA</div>
              <div className="text-xs text-green flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
                En ligne
              </div>
            </div>
          </div>
          <button
            onClick={resetConversation}
            className="text-sm border border-border-color px-3 py-1.5 rounded-lg text-gray-600 hover:bg-content-bg transition-colors"
          >
            🔄 Nouvelle conversation
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-accent text-white"
                      : "bg-content-bg text-gray-800 leading-relaxed"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Bouton pour rouvrir le bilan depuis l'historique */}
                {msg.report && (
                  <button
                    onClick={() => setActiveReport(msg.report!)}
                    className="mt-1 flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/30 rounded-lg text-xs text-accent hover:bg-accent/10 transition-colors"
                  >
                    📊 Voir le bilan de {msg.report.name}
                  </button>
                )}

                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 w-full">
                    {msg.suggestedActions.map((action) => (
                      <button
                        key={action}
                        onClick={() => sendMessage(action)}
                        className="text-left text-xs px-3 py-2 border border-accent/40 bg-accent/5 text-accent rounded-lg hover:bg-accent/15 hover:border-accent/60 transition-colors font-medium"
                      >
                        💡 {action}
                      </button>
                    ))}
                  </div>
                )}

                {msg.timestamp && (
                  <span className="text-xs text-gray-400 px-1">{msg.timestamp}</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-content-bg px-4 py-3 rounded-2xl text-sm text-gray-500">
                Réflexion en cours...
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-border-color flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-3 rounded-lg border border-border-color text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-accent text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* COLONNE DROITE — Bilan de prospection (panneau latéral) */}
      {activeReport && (
        <div className="w-1/2 bg-card-bg border border-border-color rounded-xl flex flex-col overflow-hidden">
          {/* Header du panneau */}
          <div className="px-5 py-4 border-b border-border-color flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Bilan de prospection</h2>
            <button
              onClick={() => setActiveReport(null)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Entreprise */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-2xl">
                  🏢
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{activeReport.name}</h3>
                  <p className="text-sm text-gray-500">{activeReport.category}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    📍 {activeReport.address?.street} {activeReport.address?.city}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">
                  {activeReport.score >= 70 ? "Score élevé" : activeReport.score >= 50 ? "Score moyen" : "Score faible"}
                </span>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {activeReport.score}
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="flex flex-wrap gap-2 mb-4">
              {activeReport.phone && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-content-bg rounded-lg text-xs text-gray-700">
                  📞 {activeReport.phone}
                </span>
              )}
              {activeReport.email && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-content-bg rounded-lg text-xs text-gray-700">
                  ✉️ {activeReport.email}
                </span>
              )}
              {activeReport.website && (
                <a
                  href={activeReport.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-content-bg rounded-lg text-xs text-accent hover:underline"
                >
                  🔗 {activeReport.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            <div className="text-xs text-gray-400 mb-4">
              Source : {activeReport.source?.toUpperCase()}
            </div>

            {/* Présence digitale */}
            <div className="bg-content-bg rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-500">Présence digitale</div>
              <div className="font-semibold text-gray-900">{activeReport.presence_digitale}</div>
            </div>

            {/* Analyse IA */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Analyse IA</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{activeReport.analyse}</p>
            </div>

            {/* Forces / Faiblesses */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <h4 className="font-semibold text-sm text-green mb-2">Forces</h4>
                <ul className="space-y-1">
                  {activeReport.forces?.map((f, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-green">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-red-500 mb-2">Faiblesses</h4>
                <ul className="space-y-1">
                  {activeReport.faiblesses?.map((f, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-red-500">✕</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Argumentaire */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Argumentaire suggéré</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{activeReport.argumentaire}</p>
            </div>
          </div>

          {/* Footer — lien vers la page complète */}
          <div className="px-5 py-4 border-t border-border-color">
            <a
              href={`/rapports/${activeReport._id}`}
              className="block text-center bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Voir le rapport complet →
            </a>
          </div>
        </div>
      )}
    </div>

    <p className="text-xs text-gray-400 text-center mt-2">
      L&apos;agent IA peut se tromper. Vérifiez les informations importantes.
    </p>
  </div>
);
}