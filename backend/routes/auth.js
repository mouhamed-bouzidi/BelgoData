const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const authMiddleware = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleMiddleware");

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    if (password.length < 6)
      return res.status(400).json({ message: "Mot de passe trop court (6 caractères min)." });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(400).json({ message: "Email déjà utilisé." });

    const count = await User.countDocuments();
    const role = count === 0 ? "Administrateur" : "Viewer";

    const user = new User({ name, email, phone, password, role });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl || null,
      },
    });
  } catch (error) {
    console.error("❌ Signup:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email et mot de passe requis." });

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user)
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    if (user.status === "Inactif")
      return res.status(403).json({ message: "Compte désactivé." });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl || null,
      },
    });
  } catch (error) {
    console.error("❌ Login:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/auth/users — Récupérer la liste de tous les utilisateurs (Sécurisé)
router.get("/users", authMiddleware, authorizeRoles("Administrateur"), async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("❌ Get Users:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des utilisateurs." });
  }
});



module.exports = router;