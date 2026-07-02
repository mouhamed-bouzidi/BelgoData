const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

let Setting;
try {
  Setting = mongoose.model("Setting");
} catch (error) {
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
    logRetentionDays: { type: Number, default: 90 },
  }, { timestamps: true });

  Setting = mongoose.model("Setting", SettingSchema);
}

// GET : Récupérer les paramètres
router.get("/", async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    return res.status(200).json(settings);
  } catch (error) {
    console.error("❌ Erreur GET /api/settings :", error);
    return res.status(500).json({ error: "Erreur serveur lors de la récupération" });
  }
});

// PUT : Mettre à jour les paramètres
router.put("/", async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting(req.body);
    } else {
      // Nettoyer les anciennes clés de scraping si jamais elles sont envoyées par le front avant refresh
      Object.assign(settings, req.body);
    }
    const updatedSettings = await settings.save();
    return res.status(200).json(updatedSettings);
  } catch (error) {
    console.error("❌ Erreur PUT /api/settings :", error);
    return res.status(500).json({ error: "Erreur serveur lors de la sauvegarde" });
  }
});

module.exports = router;