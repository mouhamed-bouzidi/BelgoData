const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/users");
const Prospect = require("../models/Prospect");
const ScrapingSession = require("../models/ScrapingSession");
const LoginHistory = require("../models/LoginHistory");
const authMiddleware = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleMiddleware");
const { calculateGrowthRate } = require("../utils/prospectStats");

// Applique la protection Admin sur TOUTES les routes de ce fichier
router.use(authMiddleware, authorizeRoles("Administrateur"));

// MODIFICATION (PUT) : Cible uniquement "/:id" car le préfixe est géré par app.use()
router.put("/:id", async (req, res) => {
  try {
    const { role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedUser) return res.status(404).json({ error: "Utilisateur introuvable." });
    res.json({ message: "Rôle mis à jour", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// SUPPRESSION (DELETE) : Cible uniquement "/:id"
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: "Utilisateur introuvable." });
    res.json({ message: "Utilisateur supprimé" });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});
// GET /:id/stats - statistiques de prospection d'un utilisateur donné (pour son dashboard)
router.get("/:id/stats", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    const userId = req.params.id;

    const currentEnd = new Date();
    currentEnd.setHours(23, 59, 59, 999);
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentEnd.getDate() - 29);
    currentStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 29);
    previousStart.setHours(0, 0, 0, 0);

    const baseMatch = { "createdBy.userId": userId };
    // IMPORTANT : .aggregate() ne caste PAS automatiquement les valeurs selon le schéma
    // (contrairement à .find()/.countDocuments()) — il faut donc caster userId en ObjectId
    // à la main pour que les étapes $match des pipelines d'agrégation matchent réellement.
    const baseMatchAgg = { "createdBy.userId": new mongoose.Types.ObjectId(userId) };
    const periodMatch = (start, end) => ({ ...baseMatch, createdAt: { $gte: start, $lte: end } });

    const [
      total,
      emailsCount,
      websitesCount,
      avgScoreResult,
      hotLeadsCount,
      currentTotal,
      previousTotal,
      byCategory,
      bySource,
      recent,
      sessionsCount,
    ] = await Promise.all([
      Prospect.countDocuments(baseMatch),
      Prospect.countDocuments({ ...baseMatch, email: { $regex: /\S/ } }),
      Prospect.countDocuments({ ...baseMatch, website: { $regex: /\S/ } }),
      Prospect.aggregate([
        { $match: { ...baseMatchAgg, score: { $ne: null } } },
        { $group: { _id: null, avgScore: { $avg: "$score" } } },
      ]),
      Prospect.countDocuments({ ...baseMatch, score: { $gte: 80 } }),
      Prospect.countDocuments(periodMatch(currentStart, currentEnd)),
      Prospect.countDocuments(periodMatch(previousStart, previousEnd)),
      Prospect.aggregate([
        { $match: baseMatchAgg },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Prospect.aggregate([
        { $match: baseMatchAgg },
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Prospect.find(baseMatch).sort({ createdAt: -1 }).limit(5),
      ScrapingSession.countDocuments({ userId }),
    ]);

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      total,
      emailsCount,
      websitesCount,
      avgScore: Math.round(avgScoreResult[0]?.avgScore ?? 0),
      hotLeads: hotLeadsCount,
      sessionsCount,
      trends: { total: calculateGrowthRate(currentTotal, previousTotal) },
      byCategory,
      bySource,
      recent,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id/sessions - logs de scraping (sessions) déclenchés par un utilisateur donné
router.get("/:id/sessions", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const userId = req.params.id;

    const [sessions, total] = await Promise.all([
      ScrapingSession.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ScrapingSession.countDocuments({ userId }),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), results: sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id/login-history - historique des connexions d'un utilisateur donné
router.get("/:id/login-history", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const userId = req.params.id;

    const [history, total] = await Promise.all([
      LoginHistory.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      LoginHistory.countDocuments({ userId }),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), results: history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;