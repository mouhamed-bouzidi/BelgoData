const mongoose = require("mongoose");

const LoginHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    success: { type: Boolean, default: true }, // pour tracer aussi les tentatives échouées si besoin plus tard
  },
  { timestamps: true }
);

LoginHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("LoginHistory", LoginHistorySchema);