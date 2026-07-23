const mongoose = require("mongoose");

const DeletionLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, default: null },
    type: { type: String, enum: ["unit", "bulk"], required: true },
    prospectId: { type: mongoose.Schema.Types.ObjectId, ref: "Prospect", default: null }, // rempli uniquement pour une suppression unitaire
    prospectName: { type: String, default: null }, // snapshot du nom, utile une fois le prospect réellement supprimé
    deletedCount: { type: Number, default: 1 }, // 1 pour une suppression unitaire, N pour un bulk-delete
    filter: { type: mongoose.Schema.Types.Mixed, default: null }, // filtre Mongo utilisé pour un bulk-delete
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

DeletionLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("DeletionLog", DeletionLogSchema);
