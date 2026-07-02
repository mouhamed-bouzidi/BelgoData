"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Save, CheckCircle } from "lucide-react";

interface SettingsData {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyCountry: string;
  companyTimezone: string;
  interfaceLanguage: string;
  currency: string;
  dateFormat: string;
  itemsPerPage: number;
  darkMode: boolean;
  notificationsSound: boolean;
  maskSensitiveData: boolean;
  notificationsEmailAlerts: string;
  weeklyReportEmail: string;
  autoRefreshData: boolean;
  activityLogEnabled: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: string;
  allowPublicSharing: boolean;
  nominatimDelay: string;
  overpassDelay: string;
  maxResults: number;
  coordinatesCacheDays: number;
  strictRateLimit: boolean;
  retryOnError: boolean;
  maxRetries: number;
  exportFormat: string;
  exportIncludeImages: boolean;
  autoExport: boolean;
  webhookUrl: string;
  slackNotifications: boolean;
  googleSheetsSync: boolean;
  maintenanceMode: boolean;
  backupFrequency: string;
  logRetentionDays: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const defaultSettings: SettingsData = {
  companyName: "3LM Solutions",
  companyEmail: "contact@3lmsolutions.net",
  companyPhone: "+216 25 632 134",
  companyAddress: "AV 18 janvier, Ariana Médina 2080",
  companyCountry: "Tunisie",
  companyTimezone: "(UTC+01:00) Tunis",
  interfaceLanguage: "Français",
  currency: "EUR (€)",
  dateFormat: "DD/MM/YYYY",
  itemsPerPage: 50,
  darkMode: false,
  notificationsSound: true,
  maskSensitiveData: false,
  notificationsEmailAlerts: "contact@3lmsolutions.net",
  weeklyReportEmail: "ops@3lmsolutions.net",
  autoRefreshData: true,
  activityLogEnabled: true,
  twoFactorEnabled: false,
  sessionTimeout: "30 min",
  allowPublicSharing: false,
  nominatimDelay: "1 seconde",
  overpassDelay: "2 secondes",
  maxResults: 1000,
  coordinatesCacheDays: 30,
  strictRateLimit: true,
  retryOnError: true,
  maxRetries: 3,
  exportFormat: "CSV",
  exportIncludeImages: false,
  autoExport: true,
  webhookUrl: "",
  slackNotifications: false,
  googleSheetsSync: false,
  maintenanceMode: false,
  backupFrequency: "Quotidienne",
  logRetentionDays: 90,
};

export default function SettingsPage() {
  const [formData, setFormData] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [activeTab, setActiveTab] = useState("Général");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await axios.get(`${API_URL}/api/settings`);
        setFormData({ ...defaultSettings, ...res.data });
      } catch (error) {
        console.error("Erreur lors du chargement des paramètres:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ["itemsPerPage", "maxResults", "coordinatesCacheDays", "maxRetries", "logRetentionDays"];
    setFormData({
      ...formData,
      [name]: numericFields.includes(name) ? Number.parseInt(value, 10) || 0 : value,
    });
  };

  const handleToggle = (name: keyof SettingsData) => {
    setFormData({
      ...formData,
      [name]: !formData[name],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.put(`${API_URL}/api/settings`, formData);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres:", error);
      alert("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 font-medium">Chargement des paramètres de la plateforme...</div>;
  }

  return (
    <div className="p-8 bg-content-bg min-h-screen text-gray-900">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-sm text-gray-500">Configurez les paramètres généraux de la plateforme.</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green/10 border border-green/20 text-green rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in duration-200">
            <CheckCircle size={16} /> Paramètres sauvegardés avec succès !
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex gap-1 border-b border-border-color mb-6 overflow-x-auto text-sm">
          {["Général", "Notifications", "Sécurité", "Sources de données", "Exports", "Intégrations", "Système"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab ? "border-accent text-accent font-semibold" : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content Grid (Optimized Layout) */}
        {activeTab === "Général" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Company Info Box */}
              <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Informations sur entreprise</h3>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Raison sociale</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Email de contact</label>
                    <input type="email" name="companyEmail" value={formData.companyEmail} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Téléphone</label>
                    <input type="text" name="companyPhone" value={formData.companyPhone} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Adresse</label>
                  <input type="text" name="companyAddress" value={formData.companyAddress} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Pays</label>
                    <select name="companyCountry" value={formData.companyCountry} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                      <option>Belgique</option>
                      <option>Tunisie</option>
                      <option>France</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Fuseau horaire</label>
                    <select name="companyTimezone" value={formData.companyTimezone} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                      <option>(UTC+01:00) Tunis</option>
                      <option>(UTC+01:00) Bruxelles</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* General Preferences Box */}
              <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Préférences générales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Langue de interface</label>
                    <select name="interfaceLanguage" value={formData.interfaceLanguage} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                      <option>Français</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Devise</label>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                      <option>EUR (€)</option>
                      <option>USD ($)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Format de date</label>
                    <select name="dateFormat" value={formData.dateFormat} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Nombre éléments par page</label>
                    <select name="itemsPerPage" value={formData.itemsPerPage} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="pt-2 space-y-3 border-t border-border-color mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-600">Activer le mode sombre</span>
                    <button type="button" onClick={() => handleToggle("darkMode")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.darkMode ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-600">Activer les sonneries de notification</span>
                    <button type="button" onClick={() => handleToggle("notificationsSound")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.notificationsSound ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-600">Masquer les données sensibles</span>
                    <button type="button" onClick={() => handleToggle("maskSensitiveData")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.maskSensitiveData ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column (Permissions Sidebar) */}
            <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm h-fit text-xs">
              <h3 className="text-sm font-bold text-gray-900">Autorisations par défaut</h3>
              <div className="space-y-3">
                <div>
                  <span className="bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-md font-semibold">Administrateur</span>
                  <p className="text-gray-400 mt-1">Accès complet à toutes les fonctionnalités.</p>
                </div>
                <div className="border-t border-border-color pt-2">
                  <span className="bg-green/10 text-green border border-green/20 px-2 py-0.5 rounded-md font-semibold">Commercial</span>
                  <ul className="text-gray-500 mt-1 space-y-1 list-inside list-disc">
                    <li>Voir & gérer les prospects</li>
                    <li>Exporter les données</li>
                    <li>Générer des bilans</li>
                    <li>Accès au dashboard</li>
                  </ul>
                </div>
                <div className="border-t border-border-color pt-2">
                  <span className="bg-orange/10 text-orange border border-orange/20 px-2 py-0.5 rounded-md font-semibold">Viewer</span>
                  <ul className="text-gray-500 mt-1 space-y-1 list-inside list-disc">
                    <li>Voir les prospects</li>
                    <li>Voir les bilans</li>
                    <li>Accès en lecture seule</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "Notifications" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Alertes et rappels</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Activer les sonneries de notification</span>
                <button type="button" onClick={() => handleToggle("notificationsSound")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.notificationsSound ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Email pour les alertes</label>
                <input type="email" name="notificationsEmailAlerts" value={formData.notificationsEmailAlerts} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Email pour les rapports hebdomadaires</label>
                <input type="email" name="weeklyReportEmail" value={formData.weeklyReportEmail} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Actualisation automatique des données</span>
                <button type="button" onClick={() => handleToggle("autoRefreshData")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.autoRefreshData ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Journalisation des activités</span>
                <button type="button" onClick={() => handleToggle("activityLogEnabled")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.activityLogEnabled ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Sécurité" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Protection des accès</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Authentification à deux facteurs</span>
                <button type="button" onClick={() => handleToggle("twoFactorEnabled")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.twoFactorEnabled ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Partage public autorisé</span>
                <button type="button" onClick={() => handleToggle("allowPublicSharing")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.allowPublicSharing ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Temps de session</label>
                <select name="sessionTimeout" value={formData.sessionTimeout} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                  <option>15 min</option>
                  <option>30 min</option>
                  <option>60 min</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Sources de données" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Scraping et géocodage</h3>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Délai Nominatim</label>
                <select name="nominatimDelay" value={formData.nominatimDelay} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                  <option>1 seconde</option>
                  <option>2 secondes</option>
                  <option>5 secondes</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Délai Overpass</label>
                <select name="overpassDelay" value={formData.overpassDelay} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                  <option>1 seconde</option>
                  <option>2 secondes</option>
                  <option>5 secondes</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Nombre maximal de résultats</label>
                <input type="number" name="maxResults" value={formData.maxResults} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Durée du cache des coordonnées (jours)</label>
                <input type="number" name="coordinatesCacheDays" value={formData.coordinatesCacheDays} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Limiter strictement les requêtes</span>
                <button type="button" onClick={() => handleToggle("strictRateLimit")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.strictRateLimit ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Réessayer en cas d&apos;erreur</span>
                <button type="button" onClick={() => handleToggle("retryOnError")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.retryOnError ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Nombre maximal de tentatives</label>
                <input type="number" name="maxRetries" value={formData.maxRetries} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "Exports" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Format et automatisation</h3>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Format d&apos;export</label>
                <select name="exportFormat" value={formData.exportFormat} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                  <option>CSV</option>
                  <option>XLSX</option>
                  <option>PDF</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Inclure les images dans les exports</span>
                <button type="button" onClick={() => handleToggle("exportIncludeImages")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.exportIncludeImages ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Export automatique hebdomadaire</span>
                <button type="button" onClick={() => handleToggle("autoExport")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.autoExport ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Intégrations" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Webhooks et synchronisation</h3>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Webhook principal</label>
                <input type="text" name="webhookUrl" value={formData.webhookUrl} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Notifications Slack</span>
                <button type="button" onClick={() => handleToggle("slackNotifications")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.slackNotifications ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Synchronisation Google Sheets</span>
                <button type="button" onClick={() => handleToggle("googleSheetsSync")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.googleSheetsSync ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Système" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border-color p-5 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Maintenance et logs</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Mode maintenance</span>
                <button type="button" onClick={() => handleToggle("maintenanceMode")} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.maintenanceMode ? "bg-accent flex justify-end" : "bg-gray-200 flex justify-start"}`}><span className="w-4 h-4 bg-white rounded-full shadow-sm"></span></button>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Fréquence des sauvegardes</label>
                <select name="backupFrequency" value={formData.backupFrequency} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700">
                  <option>Quotidienne</option>
                  <option>Hebdomadaire</option>
                  <option>Mensuelle</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Conservation des logs (jours)</label>
                <input type="number" name="logRetentionDays" value={formData.logRetentionDays} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-border-color rounded-xl text-sm outline-none focus:border-accent transition-colors text-gray-700" />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}