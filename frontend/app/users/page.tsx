"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, XCircle, Calendar, Mail, Phone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "Administrateur" | "Commercial" | "Viewer";
  status: "Actif" | "Inactif";
  lastLogin: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await axios.get(`${API_URL}/api/auth/users`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setUsers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Erreur lors du chargement des utilisateurs :", err);
        setError("Impossible de charger la liste des utilisateurs.");
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [token]);

  if (loading) {
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
          Contrôlez les accès et les rôles des membres de la plateforme
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                // Couleurs dynamiques selon le badge de rôle
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
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6d5ef0] to-[#8b5cf6] text-white flex items-center justify-center font-bold shadow-sm">
                          {u.name.slice(0, 2).toUpperCase()}
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

                    {/* Rôle */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm ${roleColors[u.role] || roleColors.Viewer}`}>
                        {u.role}
                      </span>
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
                        <span>{u.lastLogin ? new Date(u.lastLogin).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Jamais"}</span>
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