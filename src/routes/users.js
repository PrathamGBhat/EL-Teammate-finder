const express = require("express");
const router = express.Router();
const User = require("../db/models/User");
const { getUser } = require("../db/access");
const { toPublicUser } = require("../utils/auth");
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
