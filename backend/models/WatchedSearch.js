const mongoose = require("mongoose");

const WatchedSearchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    postalCode: { type: String, required: true },
    label: { type: String, default: null }, // ex: "Boulangeries à Namur"
    frequencyHours: { type: Number, default: 24 }, // fréquence minimale entre 2 exécutions
    active: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true }
);

WatchedSearchSchema.index({ userId: 1, category: 1, postalCode: 1 }, { unique: true });

module.exports = mongoose.model("WatchedSearch", WatchedSearchSchema);
