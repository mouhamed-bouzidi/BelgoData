// Middleware pour vérifier si l'utilisateur a le rôle requis
const checkRole = (rolesAutorises) => {
  return (req, res, next) => {
    // Note : req.user doit être injecté au préalable par ton middleware d'authentification (JWT)
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès interdit : privilèges insuffisants." });
    }

    next();
  };
};

module.exports = { checkRole };