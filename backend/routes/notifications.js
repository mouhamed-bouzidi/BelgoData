const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// GET /api/notifications - liste paginée + compteur non lues
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments({ userId: req.user.id }),
      Notification.countDocuments({ userId: req.user.id, read: false }),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), unreadCount, results: notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/notifications/:id/read - marque une notification comme lue
router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification non trouvée." });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/notifications/read-all - marque tout comme lu
router.patch("/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
    res.json({ message: "Toutes les notifications ont été marquées comme lues." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
