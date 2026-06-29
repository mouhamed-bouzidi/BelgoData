const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");



// GET /api/reports - liste paginée de tous les bilans
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      reportsCollection
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .toArray(),
      reportsCollection.countDocuments({}),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), results: reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reports/:id - supprime un bilan
router.delete("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const result = await reportsCollection.deleteOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Bilan non trouvé" });
    }

    res.json({ message: "Bilan supprimé", id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// GET /api/reports/:id - récupère un rapport par son ID
router.get("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const report = await reportsCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!report) {
      return res.status(404).json({ error: "Rapport non trouvé" });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/by-prospect/:prospectId - dernier rapport pour un prospect donné
router.get("/by-prospect/:prospectId", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const report = await reportsCollection
      .find({ prospect_id: req.params.prospectId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    if (!report) {
      return res.status(404).json({ error: "Aucun rapport trouvé pour ce prospect" });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;