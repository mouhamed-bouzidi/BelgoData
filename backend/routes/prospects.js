const express = require("express");
const router = express.Router();
const Prospect = require("../models/Prospect");

// GET /api/prospects?postal_code=1000&category=restaurant&page=1&limit=20
router.get("/", async (req, res) => {
  try {
    const { postal_code, category, source, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (postal_code) filter["address.postcode"] = postal_code;
    if (category) filter.category = category;
    if (source) filter.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [prospects, total] = await Promise.all([
      Prospect.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Prospect.countDocuments(filter),
    ]);

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      results: prospects,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/stats - statistiques agrégées pour le Dashboard
router.get("/stats", async (req, res) => {
  try {
    const total = await Prospect.countDocuments();
    const emailsCount = await Prospect.countDocuments({ email: { $ne: null } });
    const websitesCount = await Prospect.countDocuments({ website: { $ne: null } });

    // Répartition par catégorie
    const byCategory = await Prospect.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Répartition par source
    const bySource = await Prospect.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Répartition par code postal (proxy pour la géo, en attendant la province)
    const byPostcode = await Prospect.aggregate([
      { $group: { _id: "$address.postcode", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Derniers prospects ajoutés
    const recent = await Prospect.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      total,
      emailsCount,
      websitesCount,
      byCategory,
      bySource,
      byPostcode,
      recent,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/:id
router.get("/:id", async (req, res) => {
  try {
    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ error: "Prospect non trouvé" });
    }
    res.json(prospect);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/prospects/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Prospect.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Prospect non trouvé" });
    }
    res.json({ message: "Prospect supprimé", id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;