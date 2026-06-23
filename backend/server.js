const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Charge le .env situé à la racine du monorepo (pas dans backend/)
dotenv.config({ path: path.join(__dirname, '..', '.env'), debug: false });
const connectDB = require("./config/db");
const prospectsRoutes = require("./routes/prospects");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "backend" });
});

app.use("/api/prospects", prospectsRoutes);

const PORT = process.env.PORT_BACKEND || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend Express démarré sur le port ${PORT}`);
  });
});