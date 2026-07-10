const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const ScrapingSession = require("../models/ScrapingSession");
const Prospect = require("../models/Prospect");

// GET /api/scraping/sessions - liste des sessions
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await ScrapingSession.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scraping/sessions/:sessionId/prospects
router.get("/sessions/:sessionId/prospects", async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [prospects, total] = await Promise.all([
      Prospect.find({ sessionId: req.params.sessionId })
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Prospect.countDocuments({ sessionId: req.params.sessionId }),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), results: prospects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;