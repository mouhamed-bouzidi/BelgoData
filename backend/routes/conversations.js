const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Conversation = require("../models/Conversation");
const authMiddleware = require("../middleware/auth");

// GET /api/conversations - liste des conversations de l'utilisateur connecté
router.get("/", authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(conversations);
  } catch (error) {
    console.error("Erreur récupération conversations:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/conversations - créer une nouvelle conversation
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, messages = [] } = req.body;
    if (!title) return res.status(400).json({ error: "Le titre de la conversation est requis." });

    const conversation = new Conversation({
      userId: req.user.id,
      userName: req.user.name,
      title,
      messages,
    });

    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    console.error("Erreur création conversation:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/conversations/:id - mettre à jour une conversation existante
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID de conversation invalide." });
    }

    const { messages, title } = req.body;
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
    if (!conversation) return res.status(404).json({ error: "Conversation non trouvée." });

    if (messages) conversation.messages = messages;
    if (title) conversation.title = title;

    await conversation.save();
    res.json(conversation);
  } catch (error) {
    console.error("Erreur mise à jour conversation:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/conversations/:id - supprimer une conversation
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await Conversation.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Conversation non trouvée." });
    res.json({ message: "Conversation supprimée." });
  } catch (error) {
    console.error("Erreur suppression conversation:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
