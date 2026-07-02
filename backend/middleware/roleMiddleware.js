// Middleware pour restreindre l'accès à certains rôles
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user est injecté juste avant par ton authMiddleware
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Accès refusé : Vous n'avez pas les permissions nécessaires pour effectuer cette action." 
      });
    }
    next();
  };
};

module.exports = authorizeRoles;