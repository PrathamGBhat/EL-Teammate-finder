const express = require("express");
const router = express.Router();
const store = require("../db/store");
const { getTeam, getAdvertisementsOf, advertiseTeam } = require("../db/access");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/advertisements -> mine
router.get("/", (req, res) => {
  return res.status(200).json({ advertisements: getAdvertisementsOf(req.currentUsn) });
});

// POST /api/advertisements  { teamId }
router.post("/", (req, res) => {
  const currentUsn = req.currentUsn;
  const { teamId } = req.body || {};
  if (!teamId) return res.status(400).json({ error: "teamId is required" });
  const team = getTeam(teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  const ad = advertiseTeam(currentUsn, team.id);
  if (!ad) return res.status(409).json({ error: "Already advertising this team" });
  return res.status(201).json({ advertisement: ad });
});

// DELETE /api/advertisements/:adId  -> "deadvertise"
router.delete("/:adId", (req, res) => {
  const currentUsn = req.currentUsn;
  const adId = Number(req.params.adId);
  const ad = store.advertisements.find((a) => a.id === adId);
  if (!ad) return res.status(404).json({ error: "Advertisement not found" });
  if (ad.advertiserUSN !== currentUsn) {
    return res.status(403).json({ error: "Not your advertisement" });
  }
  store.deleteAdvertisement(adId);
  return res.status(200).json({ deleted: true });
});

module.exports = router;
