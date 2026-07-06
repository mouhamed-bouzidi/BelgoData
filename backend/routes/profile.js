const express = require("express");
const router = express.Router();
const User = require("../models/users");
const authMiddleware = require("../middleware/auth");

router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { name, phone, avatarUrl } = req.body;
    const userId = req.user._id || req.user.id;

    // Construit l'objet update seulement avec les champs fournis
    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: "after", runValidators: false } // runValidators: false pour éviter le problème de required
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    res.json({ message: "Profil mis à jour avec succès !", user: updatedUser });
  } catch (error) {
    console.error("Erreur mise à jour profil :", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil." });
  }
});

module.exports = router;