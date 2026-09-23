"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
  Archive,
  ChevronLeft,
  Loader,
  RotateCw,
  RotateCcw,
  Search,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface Prospect {
  _id: string;
  name: string;
  category: string;
  address: {
    street?: string;
    city?: string;
    postcode?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  source: string;
  score?: number;
  createdAt: string;
  deletedLog?: {
    userId: string;
    userName: string;
    createdAt: string;
  };
}

interface ArchivesResponse {
  data: Prospect[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function ArchivesPage() {
  const { user, token, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [archives, setArchives] = useState<Prospect[]>([]);
  const [totalArchives, setTotalArchives] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Tous");
  const [sourceFilter, setSourceFilter] = useState<string>("Tous");
  const [emailFilter, setEmailFilter] = useState<string>("Tous");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const pageSize = 20;

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchArchives = async () => {
    try {
      setIsLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.get<ArchivesResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/archives/list`,
        {
          ...config,
          params: {
            page: currentPage,
            limit: pageSize,
          },
        }
      );

      setArchives(response.data.data);
      setTotalArchives(response.data.total);
    } catch (error) {
      console.error("❌ Erreur chargement archives:", error);
      setRestoreMessage({
        type: "error",
        text: "Impossible de charger les archives",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && !loading && token) {
      fetchArchives();
    }
  }, [mounted, loading, token, currentPage]);

  const handleRestoreOne = async (prospectId: string) => {
    try {
      setIsRestoring(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/archives/restore/${prospectId}`,
        {},
        config
      );

      setRestoreMessage({
        type: "success",
        text: "Prospect restauré avec succès",
      });

      setArchives(archives.filter((a) => a._id !== prospectId));
      setTotalArchives(totalArchives - 1);
      setSelectedItems(
        (prev) =>
          new Set(Array.from(prev).filter((id) => id !== prospectId))
      );

      setTimeout(() => setRestoreMessage(null), 3000);
    } catch (error) {
      console.error("❌ Erreur restauration:", error);
      setRestoreMessage({
        type: "error",
        text: "Impossible de restaurer le prospect",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreMultiple = async () => {
    if (selectedItems.size === 0) return;

    try {
      setIsRestoring(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/archives/restore-bulk`,
        { ids: Array.from(selectedItems) },
        config
      );

      setRestoreMessage({
        type: "success",
        text: `${response.data.modifiedCount} prospect(s) restauré(s)`,
      });

      setArchives(
        archives.filter(
          (a) => !selectedItems.has(a._id)
        )
      );
      setTotalArchives(totalArchives - selectedItems.size);
      setSelectedItems(new Set());

      setTimeout(() => setRestoreMessage(null), 3000);
    } catch (error) {
      console.error("❌ Erreur restauration en masse:", error);
      setRestoreMessage({
        type: "error",
        text: "Impossible de restaurer les prospects",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleItemSelection = (prospectId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(prospectId)) {
        newSet.delete(prospectId);
      } else {
        newSet.add(prospectId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredArchives.length && filteredArchives.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredArchives.map((a) => a._id)));
    }
  };

  const calculateDeletionDate = (createdAt?: string) => {
    if (!createdAt) return "—";
    const date = new Date(createdAt);
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysRemaining = (createdAt?: string) => {
    if (!createdAt) return null;
    const deletionDate = new Date(createdAt);
    deletionDate.setDate(deletionDate.getDate() + 30);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysRemaining;
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Vous devez être connecté</p>
        </div>
      </div>
    );
  }

  // Extract unique categories and sources from archives
  const uniqueCategories = Array.from(
    new Set(archives.map((p) => p.category).filter(Boolean))
  ).sort();
  const uniqueSources = Array.from(
    new Set(archives.map((p) => p.source).filter(Boolean))
  ).sort();

  const filteredArchives = archives.filter((prospect) => {
    const matchesSearch = prospect.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "Tous" || prospect.category === categoryFilter;
    const matchesSource =
      sourceFilter === "Tous" || prospect.source === sourceFilter;
    const hasEmail = prospect.email && prospect.email.trim().length > 0;
    const matchesEmail =
      emailFilter === "Tous" ||
      (emailFilter === "Disponible" && hasEmail) ||
      (emailFilter === "Non disponible" && !hasEmail);
    return matchesSearch && matchesCategory && matchesSource && matchesEmail;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/prospects"
              className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Retour aux prospects
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Archive className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-900">Archives</h1>
          </div>

          <p className="text-slate-600 mb-4">
            {totalArchives === 0
              ? "Aucun prospect archivé"
              : `${totalArchives} prospect(s) archivé(s)`}
          </p>

          {/* Warning Banner */}
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 mb-1">
                 Suppression automatique après 30 jours
              </p>
              <p className="text-sm text-amber-800">
                Les prospects archivés seront définitivement supprimés après 30 jours. Restaurez les prospects que vous souhaitez conserver.
              </p>
            </div>
          </div>

          {/* Notifications */}
          {restoreMessage && (
            <div
              className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
                restoreMessage.type === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {restoreMessage.type === "success" ? (
                <RotateCw className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <p
                className={
                  restoreMessage.type === "success"
                    ? "text-green-700"
                    : "text-red-700"
                }
              >
                {restoreMessage.text}
              </p>
            </div>
          )}
        </div>

        {/* Empty State */}
        {totalArchives === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
            <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Aucun prospect archivé
            </h2>
            <p className="text-slate-600 mb-6">
              Les prospects supprimés apparaîtront ici
            </p>
            <Link
              href="/prospects"
              className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour aux prospects
            </Link>
          </div>
        ) : (
          <>
            {/* Filters and Actions */}
            <div className="mb-6 bg-white p-6 rounded-lg border border-slate-200">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Catégorie
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Tous">Toutes les catégories</option>
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Source
                  </label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => {
                      setSourceFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Tous">Toutes les sources</option>
                    {uniqueSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <select
                    value={emailFilter}
                    onChange={(e) => {
                      setEmailFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Tous">Tous</option>
                    <option value="Disponible">Disponible</option>
                    <option value="Non disponible">Non disponible</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("Tous");
                      setSourceFilter("Tous");
                      setEmailFilter("Tous");
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Réinitialiser
                  </button>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pt-4 border-t border-slate-200">
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium flex items-center gap-2"
                >
                  {selectedItems.size === filteredArchives.length && filteredArchives.length > 0
                    ? "Désélectionner tous"
                    : "Sélectionner tous"}
                  {filteredArchives.length > 0 && (
                    <span className="text-xs bg-slate-300 px-2 py-0.5 rounded">
                      {selectedItems.size}/{filteredArchives.length}
                    </span>
                  )}
                </button>

                {selectedItems.size > 0 && (
                  <button
                    onClick={handleRestoreMultiple}
                    disabled={isRestoring}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    <RotateCw className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`} />
                    Restaurer ({selectedItems.size})
                  </button>
                )}
              </div>
            </div>

            {/* Archives Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredArchives.length && filteredArchives.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                  />
                  <div className="flex-1 grid grid-cols-5 gap-4 text-sm font-medium text-slate-700">
                    <div>Nom</div>
                    <div>Catégorie</div>
                    <div>Contact</div>
                    <div>Suppression prévue</div>
                    <div>Actions</div>
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-200">
                {isLoading ? (
                  <div className="px-6 py-8 text-center">
                    <Loader className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                  </div>
                ) : filteredArchives.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-600">
                    Aucun prospect trouvé
                  </div>
                ) : (
                  filteredArchives.map((prospect) => (
                    <div
                      key={prospect._id}
                      className="px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(prospect._id)}
                          onChange={() => toggleItemSelection(prospect._id)}
                          className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1 grid grid-cols-5 gap-4">
                          {/* Name */}
                          <div>
                            <p className="font-medium text-slate-900">
                              {prospect.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {prospect.address?.city || "N/A"}
                            </p>
                          </div>

                          {/* Category */}
                          <div>
                            <span className="inline-block px-3 py-1 bg-violet-100 text-violet-700 text-sm rounded-full">
                              {prospect.category}
                            </span>
                          </div>

                          {/* Contact */}
                          <div className="text-sm text-slate-600">
                            {prospect.email ? (
                              <p>{prospect.email}</p>
                            ) : prospect.phone ? (
                              <p>{prospect.phone}</p>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </div>

                          {/* Deletion Date */}
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {calculateDeletionDate(prospect.createdAt)}
                            </p>
                            {getDaysRemaining(prospect.createdAt) !== null && (
                              <p
                                className={`text-xs ${
                                  getDaysRemaining(prospect.createdAt)! <= 7
                                    ? "text-red-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {getDaysRemaining(prospect.createdAt)} jours restants
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRestoreOne(prospect._id)}
                              disabled={isRestoring}
                              className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                              <RotateCw className="w-4 h-4" />
                              Restaurer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pagination */}
            {!isLoading && Math.ceil(totalArchives / pageSize) > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {currentPage} sur{" "}
                  {Math.ceil(totalArchives / pageSize)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(
                          Math.ceil(totalArchives / pageSize),
                          p + 1
                        )
                      )
                    }
                    disabled={
                      currentPage ===
                      Math.ceil(totalArchives / pageSize)
                    }
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
