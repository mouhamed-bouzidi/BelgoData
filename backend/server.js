const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");


// Charge le .env situé à la racine du monorepo (pas dans backend/)
dotenv.config({ path: path.join(__dirname, '..', '.env'), debug: false });
const connectDB = require("./config/db");
const prospectsRoutes = require("./routes/prospects");
const reportsRoutes = require("./routes/reports");
const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");
const userManagementRoutes = require("./routes/userManagement");
const profileRoutes = require("./routes/profile");
const conversationsRoutes = require("./routes/conversations");

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true
}));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "backend" });
});

app.use("/api/reports", reportsRoutes);
app.use("/api/prospects", prospectsRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/auth/users", userManagementRoutes);
app.use('/api/profile', profileRoutes);

const PORT = process.env.PORT_BACKEND || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend Express démarré sur le port ${PORT}`);
  });
});