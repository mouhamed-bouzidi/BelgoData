const mongoose = require("mongoose");

const ScrapingSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: String, default: null },
    userName: { type: String, default: null },
    category: { type: String, required: true },
    postalCode: { type: String, required: true },
    totalFound: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScrapingSession", ScrapingSessionSchema);