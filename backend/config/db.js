const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgodata";
    console.log("🔎 Tentative de connexion MongoDB avec:", uri.replace(/(:\/\/)([^:]+):([^@]+)@/, "$1$2:***@"));
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ MongoDB connecté (Express)");
  } catch (error) {
    console.error("❌ Erreur connexion MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;