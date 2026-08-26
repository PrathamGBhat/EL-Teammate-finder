const express = require("express");
const router = express.Router();
const User = require("../db/models/User");
const { getUser } = require("../db/access");
const { toPublicUser } = require("../utils/auth");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/users?q=search
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase();
    const currentUsn = req.currentUsn;

    let query = { usn: { $ne: currentUsn } };
    if (q) {
      query.usn = { $ne: currentUsn, $regex: q, $options: "i" };
    }

    const matchedUsers = await User.find(query).limit(10).lean();
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
