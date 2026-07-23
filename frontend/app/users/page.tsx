"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle2, XCircle, Calendar, Mail, Phone, Trash2, BarChart3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
  role: "Administrateur" | "Commercial" | "Viewer";
  status: "Actif" | "Inactif";
  lastLogin: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function UsersPage() {
  const { token, loading: authLoading, user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Helper pour obtenir la configuration d'authentification avec token actif
  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("belgodata_token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  // Fonction de récupération de l'équipe (mémorisée pour éviter les boucles infinies)
  const fetchUsers = useCallback(async () => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("belgodata_token") : null);

    if (!activeToken) {
      console.warn("Pas de token disponible, attente de l'authentification...");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/auth/users`, getAuthConfig());
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur lors du chargement des utilisateurs :", err);
      setError("Impossible de charger la liste des utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, [token, getAuthConfig]);

  // Chargement initial sécurisé par rapport au chargement du contexte global d'auth
  useEffect(() => {
    if (!authLoading) {
      fetchUsers();
    }
  }, [fetchUsers, authLoading]);

  // Modification du rôle d'un utilisateur
  async function handleRoleChange(userId: string, newRole: User["role"]) {
    setActionLoadingId(userId);
    try {
      await axios.put(
        `${API_URL}/api/auth/users/${userId}`,
        { role: newRole },
        getAuthConfig()
      );
      // Mise à jour de l'état local
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: unknown) {
      console.error("Erreur changement rôle :", err);
      const errorMessage =
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Erreur lors de la mise à jour du rôle."
          : "Erreur lors de la mise à jour du rôle.";
      alert(errorMessage);
    } finally {
      setActionLoadingId(null);
    }
  }

  // Suppression d'un utilisateur
  async function handleDeleteUser(userId: string, userName: string) {
    if (currentUser && currentUser.id === userId) {
      alert("Sécurité : Vous ne pouvez pas supprimer votre propre compte administrateur.");
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${userName} ?`)) {
      return;
    }

    setActionLoadingId(userId);
    try {
      await axios.delete(`${API_URL}/api/auth/users/${userId}`, getAuthConfig());
      // Retrait de la liste locale
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err: unknown) {
      console.error("Erreur suppression :", err);
      const errorMessage =
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Impossible de supprimer cet utilisateur."
          : "Impossible de supprimer cet utilisateur.";
      alert(errorMessage);
    } finally {
      setActionLoadingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-violet-50/40 via-white to-slate-50/40">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-violet-100 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-[#6d5ef0] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
        </div>
        <p className="text-sm font-medium text-slate-500">Chargement de l&apos;équipe BelgoData...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-violet-50/40 via-white to-slate-50/50 min-h-screen space-y-8 animate-fade-in">
      {/* HEADER */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" aria-hidden />
        <h1 className="relative text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-[#6d5ef0] bg-clip-text text-transparent">
          Gestion des Utilisateurs
        </h1>
        <p className="relative text-sm font-medium text-slate-500 mt-1.5">
          Contrôlez les accès, modifiez les rôles et gérez les membres de la plateforme
        </p>
      </div>

      {error && (
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 text-red-600 px-4 py-3 rounded-2xl text-sm max-w-xl shadow-sm">
          {error}
        </div>
      )}

      {/* TABLEAU DES UTILISATEURS */}
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-[0_4px_24px_-8px_rgba(109,94,240,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_-8px_rgba(109,94,240,0.15)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-violet-50/40 via-slate-50/30 to-transparent">
                <th className="px-6 py-4 font-bold">Utilisateur</th>
                <th className="px-6 py-4 font-bold">Coordonnées</th>
                <th className="px-6 py-4 font-bold">Rôle</th>
                <th className="px-6 py-4 font-bold">Statut</th>
                <th className="px-6 py-4 font-bold">Dernière Connexion</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70">
              {users.map((u) => {
                const roleColors = {
                  Administrateur: "bg-violet-50 text-violet-700 border-violet-200/70 ring-1 ring-violet-100/50",
                  Commercial: "bg-sky-50 text-sky-700 border-sky-200/70 ring-1 ring-sky-100/50",
                  Viewer: "bg-slate-50 text-slate-600 border-slate-200 ring-1 ring-slate-100/50",
                };

                return (
                  <tr key={u._id} className="hover:bg-violet-50/30 transition-all duration-200 group">
                    {/* Identité */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-[0_4px_12px_-2px_rgba(109,94,240,0.4)] flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#6d5ef0] via-[#7c6ef2] to-[#8b5cf6] text-white ring-2 ring-white transition-transform duration-200 group-hover:scale-105">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={`Avatar ${u.name}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-sm">
                              {u.name ? u.name.slice(0, 2).toUpperCase() : "??"}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 group-hover:text-[#6d5ef0] transition-colors">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Inscrit le {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Coordonnées */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                        <Mail size={12} className="text-violet-400" />
                        <span>{u.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Phone size={12} className="text-violet-400" />
                        <span>{u.phone || "—"}</span>
                      </div>
                    </td>

                    {/* Rôle avec sélecteur éditable à la volée */}
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <select
                          value={u.role}
                          disabled={actionLoadingId === u._id}
                          onChange={(e) => handleRoleChange(u._id, e.target.value as User["role"])}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm cursor-pointer outline-none bg-transparent transition-all duration-200 focus:ring-2 focus:ring-violet-200 ${
                            roleColors[u.role] || roleColors.Viewer
                          } hover:brightness-95 disabled:opacity-50`}
                        >
                          <option value="Viewer">Viewer</option>
                          <option value="Commercial">Commercial</option>
                          <option value="Administrateur">Administrateur</option>
                        </select>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4">
                      {u.status === "Actif" ? (
                        <div className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs bg-emerald-50/70 border border-emerald-100 px-2 py-1 rounded-full">
                          <CheckCircle2 size={14} />
                          <span>Actif</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-rose-600 font-semibold text-xs bg-rose-50/70 border border-rose-100 px-2 py-1 rounded-full">
                          <XCircle size={14} />
                          <span>Inactif</span>
                        </div>
                      )}
                    </td>

                    {/* Dernière Connexion */}
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-violet-400" />
                        <span>
                          {u.lastLogin
                            ? new Date(u.lastLogin).toLocaleString("fr-FR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "Jamais"}
                        </span>
                      </div>
                    </td>

                    {/* Boutons d'actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => router.push(`/users/${u._id}`)}
                          className="p-2 text-slate-400 hover:text-[#6d5ef0] hover:bg-violet-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                          title="Voir le dashboard de prospection"
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={actionLoadingId === u._id}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                          title="Supprimer définitivement"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
