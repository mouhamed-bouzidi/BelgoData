const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["new_prospects"], default: "new_prospects" },
    message: { type: String, required: true },
    meta: {
      category: { type: String, default: null },
      postalCode: { type: String, default: null },
      count: { type: Number, default: 0 },
      sample: { type: [String], default: [] },
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
