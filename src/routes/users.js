const express = require("express");
const router = express.Router();
const User = require("../db/models/User");
const { getUser } = require("../db/access");
const { hashPassword, toPublicUser } = require("../utils/auth");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// Helper function to escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/users?q=search
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const currentUsn = req.currentUsn;

    if (!q) {
      return res.status(200).json({ users: [] });
    }

    const escapedQ = escapeRegex(q);
    // Anchor search at start ^ for strict prefix matching (e.g. 1RV25)
    const query = {
      usn: { $ne: currentUsn, $regex: "^" + escapedQ, $options: "i" },
    };

    const matchedUsers = await User.find(query).sort({ usn: 1 }).limit(10).lean();
    return res.status(200).json({ users: matchedUsers.map(toPublicUser) });
  } catch (err) {
    return res.status(500).json({ error: "Search users failed" });
  }
});

// PUT /api/users/me/password (Change password for logged-in user)
router.put("/me/password", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await User.findOne({ usn: currentUsn });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.passwordHash !== hashPassword(currentPassword)) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    user.passwordHash = hashPassword(newPassword);
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update password" });
  }
});

// GET /api/users/:usn
router.get("/:usn", async (req, res) => {
  try {
    const user = await getUser(req.params.usn);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: "Fetch user failed" });
  }
});

module.exports = router;
