const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ["Administrateur", "Commercial", "Viewer"], 
    default: "Viewer" 
  },
  status: { 
    type: String, 
    required: true, 
    enum: ["Actif", "Inactif"], 
    default: "Actif" 
  },
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);