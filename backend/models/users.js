const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["Administrateur", "Commercial", "Viewer"],
      default: "Viewer",
    },
    status: {
      type: String,
      enum: ["Actif", "Inactif"],
      default: "Actif",
    },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = async function (candidate) {
  if (typeof candidate !== "string" || !candidate.trim()) return false;
  if (typeof this.password !== "string" || !this.password) return false;

  if (this.password.startsWith("$2")) {
    return bcrypt.compare(candidate, this.password);
  }

  if (this.password === candidate) {
    this.password = await bcrypt.hash(candidate, 10);
    await this.save({ validateBeforeSave: false });
    return true;
  }

  return false;
};

module.exports = mongoose.model("User", UserSchema);