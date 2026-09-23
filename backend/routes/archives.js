const express = require("express");
const router = express.Router();
const Prospect = require("../models/Prospect");
const DeletionLog = require("../models/DeletionLog");
const authMiddleware = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleMiddleware");

// GET /api/archives/list - récupère les prospects archivés/supprimés
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const archivedFilter = { deleted: true };
    
    const [archived, total] = await Promise.all([
      Prospect.find(archivedFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Prospect.countDocuments(archivedFilter),
    ]);

    const deletionLogs = await DeletionLog.find({ prospectId: { $in: archived.map(a => a._id) } }).lean();
    const logMap = Object.fromEntries(deletionLogs.map(log => [String(log.prospectId), log]));

    const data = archived.map(prospect => ({
      _id: prospect._id,
      name: prospect.name,
      category: prospect.category,
      address: prospect.address,
      phone: prospect.phone,
      email: prospect.email,
      website: prospect.website,
      source: prospect.source,
      score: prospect.score,
      createdAt: prospect.createdAt,
      deletedLog: logMap[String(prospect._id)] || null,
    }));

    res.json({ 
      data, 
      total, 
      page, 
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("❌ Erreur chargement archives:", error);
    res.status(500).json({ error: "archives_load_failed" });
  }
});

// POST /api/archives/restore/:id - restaure un prospect archivé
router.post("/restore/:id", authMiddleware, authorizeRoles("Administrateur", "Commercial"), async (req, res) => {
  try {
    const restored = await Prospect.findByIdAndUpdate(
      req.params.id,
      { deleted: false },
      { new: true }
    );

    if (!restored) {
      return res.status(404).json({ error: "Prospect archivé non trouvé" });
    }

    res.json({ message: "Prospect restauré", prospect: restored });
  } catch (error) {
    console.error("❌ Erreur restauration prospect:", error);
    res.status(500).json({ error: "restore_failed" });
  }
});

// POST /api/archives/restore-bulk - restaure plusieurs prospects archivés
router.post("/restore-bulk", authMiddleware, authorizeRoles("Administrateur", "Commercial"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Liste d'IDs vide" });
    }

    const result = await Prospect.updateMany(
      { _id: { $in: ids }, deleted: true },
      { deleted: false }
    );

    res.json({ message: "Prospects restaurés", modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("❌ Erreur restauration en masse:", error);
    res.status(500).json({ error: "bulk_restore_failed" });
  }
});

module.exports = router;
