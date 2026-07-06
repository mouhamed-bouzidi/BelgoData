"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { User as UserIcon, Phone, Mail, Save, ImageIcon, CheckCircle, Upload } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProfilePage() {
  const { token, user, updateUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
      setAvatar(user.avatarUrl || "");
    }
  }, [user]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 2 Mo.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.put(
        `${API_URL}/api/profile/update`,
        { name, phone, avatarUrl: avatar },
        { headers: { Authorization: token ? `Bearer ${token}` : "" } }
      );
      updateUser({ name, phone, avatarUrl: avatar });
      setSuccess("Votre profil a été enregistré avec succès !");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error || "Une erreur est survenue.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 bg-slate-50/30 min-h-screen space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mon Profil</h1>
        <p className="text-sm font-medium text-gray-400 mt-0.5">
          Gérez vos informations personnelles et configurez votre identité BelgoData
        </p>
      </div>

      <div className="max-w-3xl bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8">
        {success && (
          <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle size={16} /> <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-6">

          {/* Section Avatar */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
            {/* Aperçu */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6d5ef0] to-[#8b5cf6] text-white flex items-center justify-center font-bold text-2xl shadow-md flex-shrink-0 overflow-hidden">
              {mounted && avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{mounted && name ? name.slice(0, 2).toUpperCase() : "??"}</span>
              )}
            </div>

            {/* Upload */}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Photo de profil
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-slate-100 transition-colors">
                <Upload size={15} />
                Choisir une image locale
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar("")}
                  className="ml-2 text-xs text-red-400 hover:text-red-600 underline"
                >
                  Supprimer
                </button>
              )}
              <p className="text-xs text-gray-400">JPG, PNG, GIF — max 2 Mo</p>
            </div>
          </div>

          {/* Champs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <UserIcon size={13} /> Nom & Prénom
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-gray-100 rounded-xl focus:border-[#6d5ef0] focus:bg-white transition-all outline-none font-medium text-gray-900 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Phone size={13} /> Téléphone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+32 4XX XX XX XX"
                className="w-full px-4 py-3 bg-slate-50 border border-gray-100 rounded-xl focus:border-[#6d5ef0] focus:bg-white transition-all outline-none font-medium text-gray-900 text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Mail size={13} /> Email (Non modifiable)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-4 py-3 bg-slate-100 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed font-medium text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#6d5ef0] text-white font-bold text-sm rounded-xl shadow-md hover:bg-[#5b4ee0] transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}