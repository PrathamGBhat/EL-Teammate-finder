const express = require("express");
const router = express.Router();
const User = require("../db/models/User");
const ConnectionRequest = require("../db/models/ConnectionRequest");
const { getUser, getConnectionsOf } = require("../db/access");
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

    // Fetch existing connections & pending outgoing requests
    const [connections, pendingRequests] = await Promise.all([
      getConnectionsOf(currentUsn),
      ConnectionRequest.find({ from: currentUsn, status: "PENDING" }).lean(),
    ]);

    const connectedUsns = new Set(connections.map((c) => c.usn));
    const requestedUsns = new Set(pendingRequests.map((r) => r.to));

    // Exclude current user & already connected users from search
    const query = {
      usn: {
        $ne: currentUsn,
        $nin: Array.from(connectedUsns),
        $regex: "^" + escapedQ,
        $options: "i",
      },
    };

    const matchedUsers = await User.find(query).sort({ usn: 1 }).limit(10).lean();

    const results = matchedUsers.map((u) => ({
      ...toPublicUser(u),
      isRequested: requestedUsns.has(u.usn),
    }));

    return res.status(200).json({ users: results });
  } catch (err) {
    return res.status(500).json({ error: "Search users failed" });
  }
});

const ALLOWED_BRANCHES = ["CSE", "CD", "CY", "CI", "CH", "ISE", "BT", "EC", "EE", "ET", "CV", "ME", "ASE", "IM"];

// PUT /api/users/me (Update name & branch)
router.put("/me", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    let { name, branch } = req.body || {};
    name = (name || "").trim();
    branch = (branch || "").trim().toUpperCase();

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!branch || !ALLOWED_BRANCHES.includes(branch)) {
      return res.status(400).json({ error: "Invalid branch selected" });
    }

    const user = await User.findOne({ usn: currentUsn });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.name = name;
    user.branch = branch;
    await user.save();

    return res.status(200).json({ user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update profile details" });
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
