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
const scrapingRoutes = require("./routes/scraping");


const http = require("http");
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
app.use("/api/scraping", scrapingRoutes);


const PORT = process.env.PORT_BACKEND || 5000;
const server = http.createServer({ maxHeaderSize: 32768 }, app);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Backend Express démarré sur le port ${PORT}`);
  });
});