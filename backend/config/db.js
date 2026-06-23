const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log("✅ MongoDB connecté (Express)");
  } catch (error) {
    console.error("❌ Erreur connexion MongoDB:", error.message);
    process.exit(1); // arrête le process si la DB est inaccessible — pas de serveur sans DB
  }
};

module.exports = connectDB;