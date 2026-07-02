const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema({
  companyName: { type: String, default: "3LM Solutions" },
  companyEmail: { type: String, default: "contact@3lmsolutions.net" },
  companyPhone: { type: String, default: "+216 25 632 134" },
  companyAddress: { type: String, default: "AV 18 janvier, Ariana Médina 2080" },
  companyCountry: { type: String, default: "Tunisie" },
  companyTimezone: { type: String, default: "(UTC+01:00) Tunis" },

  interfaceLanguage: { type: String, default: "Français" },
  currency: { type: String, default: "EUR (€)" },
  dateFormat: { type: String, default: "DD/MM/YYYY" },
  itemsPerPage: { type: Number, default: 50 },
  darkMode: { type: Boolean, default: false },
  notificationsSound: { type: Boolean, default: true },
  maskSensitiveData: { type: Boolean, default: false },

  notificationsEmailAlerts: { type: String, default: "contact@3lmsolutions.net" },
  weeklyReportEmail: { type: String, default: "ops@3lmsolutions.net" },
  autoRefreshData: { type: Boolean, default: true },
  activityLogEnabled: { type: Boolean, default: true },

  twoFactorEnabled: { type: Boolean, default: false },
  sessionTimeout: { type: String, default: "30 min" },
  allowPublicSharing: { type: Boolean, default: false },

  nominatimDelay: { type: String, default: "1 seconde" },
  overpassDelay: { type: String, default: "2 secondes" },
  maxResults: { type: Number, default: 1000 },
  coordinatesCacheDays: { type: Number, default: 30 },
  strictRateLimit: { type: Boolean, default: true },
  retryOnError: { type: Boolean, default: true },
  maxRetries: { type: Number, default: 3 },

  exportFormat: { type: String, default: "CSV" },
  exportIncludeImages: { type: Boolean, default: false },
  autoExport: { type: Boolean, default: true },

  webhookUrl: { type: String, default: "" },
  slackNotifications: { type: Boolean, default: false },
  googleSheetsSync: { type: Boolean, default: false },

  maintenanceMode: { type: Boolean, default: false },
  backupFrequency: { type: String, default: "Quotidienne" },
  logRetentionDays: { type: Number, default: 90 }
}, { timestamps: true });

module.exports = mongoose.model("Setting", SettingSchema);