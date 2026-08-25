const express = require("express");
const router = express.Router();
const { users } = require("../db/store");
const { getUser } = require("../db/access");
const { toPublicUser } = require("../utils/auth");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/users?q=search
router.get("/", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const currentUsn = req.currentUsn;
  const matches = [...users.values()]
    .filter((u) => u.usn !== currentUsn && u.usn.toLowerCase().includes(q))
    .slice(0, 10)
    .map(toPublicUser);
  return res.status(200).json({ users: matches });
});

// GET /api/users/:usn
router.get("/:usn", (req, res) => {
  const user = getUser(req.params.usn);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.status(200).json({ user: toPublicUser(user) });
});

module.exports = router;
