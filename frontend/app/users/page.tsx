"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import axios from "axios";
import { CheckCircle2, XCircle, Calendar, Mail, Phone, Trash2 } from "lucide-react";
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Helper pour obtenir la configuration d'authentification avec token actif
  const getAuthConfig = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
  }, [token]);

  // Fonction de récupération de l'équipe (mémorisée pour éviter les boucles infinies)
  const fetchUsers = useCallback(async () => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#6d5ef0] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-400">Chargement de l&apos;équipe BelgoData...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50/30 min-h-screen space-y-8 animate-fade-in">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestion des Utilisateurs</h1>
        <p className="text-sm font-medium text-gray-400 mt-0.5">
          Contrôlez les accès, modifiez les rôles et gérez les membres de la plateforme
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm max-w-xl">
          {error}
        </div>
      )}

      {/* TABLEAU DES UTILISATEURS */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider bg-slate-50/20">
                <th className="px-6 py-4 font-bold">Utilisateur</th>
                <th className="px-6 py-4 font-bold">Coordonnées</th>
                <th className="px-6 py-4 font-bold">Rôle</th>
                <th className="px-6 py-4 font-bold">Statut</th>
                <th className="px-6 py-4 font-bold">Dernière Connexion</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                const roleColors = {
                  Administrateur: "bg-purple-50 text-purple-700 border-purple-100",
                  Commercial: "bg-blue-50 text-blue-700 border-blue-100",
                  Viewer: "bg-slate-100 text-slate-600 border-slate-200",
                };

                return (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Identité */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#6d5ef0] to-[#8b5cf6] text-white">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={`Avatar ${u.name}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold">
                              {u.name ? u.name.slice(0, 2).toUpperCase() : "??"}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-[#6d5ef0] transition-colors">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-gray-400 font-medium">
                            Inscrit le {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Coordonnées */}
                    <td className="px-6 py-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs font-medium">
                        <Mail size={12} className="text-gray-400" />
                        <span>{u.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Phone size={12} className="text-gray-400" />
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
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border shadow-sm cursor-pointer outline-none bg-transparent transition-all ${
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
                        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                          <CheckCircle2 size={14} />
                          <span>Actif</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-500 font-semibold text-xs">
                          <XCircle size={14} />
                          <span>Inactif</span>
                        </div>
                      )}
                    </td>

                    {/* Dernière Connexion */}
                    <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
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
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={actionLoadingId === u._id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
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