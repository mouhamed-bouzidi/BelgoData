const express = require("express");
const router = express.Router();
const User = require("../models/users");

// GET : Récupérer les utilisateurs
router.get("/", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    console.error("❌ Erreur lors du GET /api/users :", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST : Ajouter un utilisateur
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    if (!name || !email || !phone || !role) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    }

    const newUser = new User({
      name,
      email,
      phone,
      role,
      status: "Actif",
      lastLogin: new Date(),
    });

    const savedUser = await newUser.save();
    return res.status(201).json(savedUser);
  } catch (error) {
    console.error("❌ Erreur lors du POST /api/users :", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Cette adresse email est déjà utilisée." });
    }
    return res.status(500).json({ error: "Erreur serveur lors de la création" });
  }
});

module.exports = router;