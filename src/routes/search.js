const express = require("express");
const router = express.Router();
const { discover, discoverGlobal } = require("../db/access");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/search?branch=ECE&scope=network|global
router.get("/", async (req, res) => {
  try {
    const branch = req.query.branch;
    if (!branch) return res.status(400).json({ error: "branch is required" });
    const scope = req.query.scope || "network";
    const batch = req.query.batch || "ALL";
    const normalizedBranch = String(branch).toUpperCase();
    const results = scope === "global"
      ? await discoverGlobal(normalizedBranch, batch)
      : await discover(req.currentUsn, normalizedBranch, batch);
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
