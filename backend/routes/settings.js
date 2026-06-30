const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Déclaration autonome épurée (sans paramètres de scraping)
let Setting;
try {
  Setting = mongoose.model("Setting");
} catch (error) {
  const SettingSchema = new mongoose.Schema({
    // Informations de l'entreprise
    companyName: { type: String, default: "3LM Solutions" },
    companyEmail: { type: String, default: "contact@3lmsolutions.net" },
    companyPhone: { type: String, default: "+216 25 632 134" },
    companyAddress: { type: String, default: "AV 18 janvier, Ariana Médina 2080" },
    companyCountry: { type: String, default: "Tunisie" },
    companyTimezone: { type: String, default: "(UTC+01:00) Tunis" },

    // Préférences générales
    interfaceLanguage: { type: String, default: "Français" },
    currency: { type: String, default: "EUR (€)" },
    dateFormat: { type: String, default: "DD/MM/YYYY" },
    itemsPerPage: { type: Number, default: 50 },
    darkMode: { type: Boolean, default: false },
    notificationsSound: { type: Boolean, default: true },
    maskSensitiveData: { type: Boolean, default: false }
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