const express = require("express");
const router = express.Router();
const User = require("../models/users");
const authMiddleware = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleMiddleware");

// Applique la protection Admin sur TOUTES les routes de ce fichier
router.use(authMiddleware, authorizeRoles("Administrateur"));

// MODIFICATION (PUT) : Cible uniquement "/:id" car le préfixe est géré par app.use()
router.put("/:id", async (req, res) => {
  try {
    const { role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedUser) return res.status(404).json({ error: "Utilisateur introuvable." });
    res.json({ message: "Rôle mis à jour", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// SUPPRESSION (DELETE) : Cible uniquement "/:id"
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: "Utilisateur introuvable." });
    res.json({ message: "Utilisateur supprimé" });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});
module.exports = router;