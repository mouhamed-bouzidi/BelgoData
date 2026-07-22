const express = require("express");
const router = express.Router();
const WatchedSearch = require("../models/WatchedSearch");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// GET /api/watched-searches - liste des alertes de l'utilisateur connecté
router.get("/", async (req, res) => {
  try {
    const searches = await WatchedSearch.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(searches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/watched-searches - crée une nouvelle alerte
router.post("/", async (req, res) => {
  try {
    const { category, postalCode, label, frequencyHours } = req.body;
    if (!category || !postalCode) {
      return res.status(400).json({ message: "category et postalCode sont requis." });
    }

    const search = await WatchedSearch.findOneAndUpdate(
      { userId: req.user.id, category, postalCode },
      {
        $setOnInsert: {
          userId: req.user.id,
          category,
          postalCode,
          label: label || `${category} à ${postalCode}`,
          frequencyHours: frequencyHours || 24,
          active: true,
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json(search);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/watched-searches/:id - active/désactive ou modifie la fréquence
router.patch("/:id", async (req, res) => {
  try {
    const { active, frequencyHours, label } = req.body;
    const update = {};
    if (typeof active === "boolean") update.active = active;
    if (frequencyHours) update.frequencyHours = frequencyHours;
    if (label) update.label = label;

    const search = await WatchedSearch.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: update },
      { new: true }
    );

    if (!search) return res.status(404).json({ message: "Alerte non trouvée." });
    res.json(search);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/watched-searches/:id
router.delete("/:id", async (req, res) => {
  try {
    const result = await WatchedSearch.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Alerte non trouvée." });
    }
    res.json({ message: "Alerte supprimée." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
