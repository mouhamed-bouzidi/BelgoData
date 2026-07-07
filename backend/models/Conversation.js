const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "agent"],
      required: true,
    },
    content: { type: String, required: true },
    suggestedActions: { type: [String], default: [] },
    report: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: String, required: true },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    title: { type: String, required: true },
    messages: { type: [MessageSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Conversation", ConversationSchema);
