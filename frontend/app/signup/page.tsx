"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Building2, Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await signup(form.name, form.email, form.phone, form.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || "Erreur lors de l'inscription.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "name", label: "Nom complet", type: "text", icon: User, placeholder: "Mohamed Ali" },
    { key: "email", label: "Email", type: "email", icon: Mail, placeholder: "votre@email.com" },
    { key: "phone", label: "Téléphone", type: "text", icon: Phone, placeholder: "+32 4XX XXX XXX" },
  ];

  return (
    <div className="min-h-screen bg-content-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-blue flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900">B2B Extractor IA</div>
            <div className="text-xs text-gray-400">Belgique</div>
          </div>
        </div>

        <div className="bg-card-bg border border-border-color rounded-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Créer un compte</h1>
          <p className="text-sm text-gray-500 mb-6">Rejoignez la plateforme de prospection</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ key, label, type, icon: Icon, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">{label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-border-color rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="6 caractères minimum"
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-border-color rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-4 py-2.5 border border-border-color rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Déjà un compte ?{" "}
            <a href="/login" className="text-accent font-medium hover:underline">
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}