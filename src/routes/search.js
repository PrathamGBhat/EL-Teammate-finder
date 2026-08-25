const express = require("express");
const router = express.Router();
const { discover } = require("../db/access");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/search?branch=ECE
router.get("/", (req, res) => {
  const branch = req.query.branch;
  if (!branch) return res.status(400).json({ error: "branch is required" });
  const results = discover(req.currentUsn, String(branch).toUpperCase());
  return res.status(200).json({ results });
});

module.exports = router;
