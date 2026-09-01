const express = require("express");
const router = express.Router();
const Config = require("../db/models/Config");

// GET /api/config
router.get("/", async (req, res) => {
  try {
    const doc = await Config.findOne({ key: "latestPassingYear" }).lean();
    const latestPassingYear = doc && typeof doc.value === "number" ? doc.value : 2029;
    return res.status(200).json({ latestPassingYear });
  } catch (err) {
    return res.status(200).json({ latestPassingYear: 2029 });
  }
});

module.exports = router;
