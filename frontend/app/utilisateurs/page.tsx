"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Search,
  SlidersHorizontal,
  Download,
  UserPlus,
  Users,
  ShieldCheck,
  Briefcase,
  Eye,
  MoreVertical,
  Edit2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  isCurrentUser?: boolean;
  role: "Administrateur" | "Commercial" | "Viewer";
  email: string;
  phone: string;
  status: "Actif" | "Inactif";
  lastLogin: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // États pour le modal d'ajout
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<User["role"]>("Viewer");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Charger les utilisateurs depuis le backend
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/users`);
      setUsers(res.data);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [
    
  ]);

  // Soumettre le formulaire d'ajout au backend
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitLoading(true);
      const res = await axios.post(`${API_URL}/api/users`, {
        name: newName,
        email: newEmail,
        phone: newPhone,
        role: newRole,
      });
      
      // Ajouter le nouvel utilisateur directement dans la liste ou rafraîchir
      setUsers((prev) => [res.data, ...prev]);
      
      // Réinitialiser le formulaire et fermer le modal
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewRole("Viewer");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      alert("Une erreur est survenue lors de l'ajout de l'utilisateur.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Styles pour les badges de rôles
  const getRoleStyle = (role: User["role"]) => {
    switch (role) {
      case "Administrateur":
        return "bg-purple-50 text-purple-600 border border-purple-200";
      case "Commercial":
        return "bg-green/10 text-green border border-green/20";
      case "Viewer":
        return "bg-orange/10 text-orange border border-orange/20";
    }
  };

  // KPI calculés de manière dynamique
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "Administrateur").length;
  const commercialCount = users.filter((u) => u.role === "Commercial").length;
  const viewerCount = users.filter((u) => u.role === "Viewer").length;
  const activeCount = users.filter((u) => u.status === "Actif").length;

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400 font-medium">
        Chargement de la liste des utilisateurs...
      </div>
    );
  }

  return (
    <div className="p-8 bg-content-bg min-h-screen text-gray-900">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-sm text-gray-500">Gérez les utilisateurs et les permissions accès à la plateforme.</p>
      </div>

      {/* Action Bars */}
      <div className="flex gap-3 mb-6 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors"
          />
        </div>
        
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-border-color px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <SlidersHorizontal size={16} /> Filtres
          </button>
          <button className="flex items-center justify-center bg-white border border-border-color p-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={16} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            <UserPlus size={16} /> Ajouter un utilisateur
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-border-color p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue/10 rounded-xl flex items-center justify-center text-blue">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total utilisateurs</p>
            <p className="text-xl font-bold">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white border border-border-color p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Administrateurs</p>
            <p className="text-xl font-bold">{adminCount}</p>
          </div>
        </div>

        <div className="bg-white border border-border-color p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-green/10 rounded-xl flex items-center justify-center text-green">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Commerciaux</p>
            <p className="text-xl font-bold">{commercialCount}</p>
          </div>
        </div>

        <div className="bg-white border border-border-color p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-orange/10 rounded-xl flex items-center justify-center text-orange">
            <Eye size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Viewers</p>
            <p className="text-xl font-bold">{viewerCount}</p>
          </div>
        </div>

        <div className="bg-white border border-border-color p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue/10 rounded-xl flex items-center justify-center text-blue">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Utilisateurs actifs</p>
            <p className="text-xl font-bold">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-border-color rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-color bg-gray-50/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Téléphone</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Dernière connexion</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color text-sm text-gray-700">
              {users
                .filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{user.name}</span>
                          {user.isCurrentUser && (
                            <span className="bg-blue/10 text-blue font-semibold text-[10px] px-1.5 py-0.5 rounded-md">
                              Vous
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getRoleStyle(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">{user.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-medium text-xs">
                        {user.status === "Actif" ? (
                          <><CheckCircle2 size={14} className="text-green" /> <span className="text-gray-900">Actif</span></>
                        ) : (
                          <><XCircle size={14} className="text-red-500" /> <span className="text-gray-500">Inactif</span></>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString("fr-BE") : "Jamais"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Card Footer */}
        <div className="px-6 py-4 bg-gray-50/30 border-t border-border-color flex items-center justify-between text-xs text-gray-400 font-medium">
          <div>Affichage de 1 à {users.length} sur {totalCount} utilisateurs</div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 border border-border-color bg-white rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronLeft size={14} />
            </button>
            <button className="w-7 h-7 bg-accent text-white font-semibold rounded-lg flex items-center justify-center shadow-sm">1</button>
            <button className="p-1.5 border border-border-color bg-white rounded-lg text-gray-400 hover:bg-gray-50" disabled>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 🎯 MODAL POP-UP : AJOUTER UN UTILISATEUR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-border-color shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
              <h3 className="text-base font-bold text-gray-900">Ajouter un utilisateur</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nom complet</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mohamed Ali"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Adresse Email</label>
                <input
                  type="email"
                  required
                  placeholder="exemple@3lmsolutions.net"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Numéro de Téléphone</label>
                <input
                  type="text"
                  required
                  placeholder="+216 25 632 134"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Rôle Plateforme</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as User["role"])}
                  className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors"
                >
                  <option value="Administrateur">Administrateur</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              {/* Boutons d'actions du Modal */}
              <div className="flex gap-3 pt-4 border-t border-border-color mt-6 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border-color rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {submitLoading ? "Ajout en cours..." : "Confirmer l'ajout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}