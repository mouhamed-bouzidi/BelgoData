"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Bot, Sparkles, Send } from "lucide-react";

interface Message {
  role: "user" | "agent";
  content: string;
  suggestedActions?: string[];
  timestamp: string;
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
      };

      setMessages((prev) => [...prev, agentMessage]);
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

      {/* Chat container */}
      <div className="flex-1 bg-card-bg border border-border-color rounded-xl flex flex-col overflow-hidden">
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
          {mounted &&
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-accent text-white"
                        : "bg-content-bg text-gray-800 leading-relaxed"
                    }`}
                  >
                    {msg.content}
                  </div>

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
                    <span className="text-xs text-gray-400 px-1" suppressHydrationWarning>
                      {msg.timestamp}
                    </span>
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

      <p className="text-xs text-gray-400 text-center mt-2">
        L&apos;agent IA peut se tromper. Vérifiez les informations importantes.
      </p>
    </div>
  );
}