const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

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