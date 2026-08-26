const express = require("express");
const router = express.Router();
const Advertisement = require("../db/models/Advertisement");
const {
  getTeam,
  getAdvertisementsOf,
  advertiseTeam,
  deleteAdvertisement,
} = require("../db/access");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/advertisements -> mine
router.get("/", async (req, res) => {
  try {
    const ads = await getAdvertisementsOf(req.currentUsn);
    return res.status(200).json({ advertisements: ads });
  } catch (err) {
    return res.status(500).json({ error: "Fetch advertisements failed" });
  }
});

// POST /api/advertisements  { teamId }
router.post("/", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const { teamId } = req.body || {};
    if (!teamId) return res.status(400).json({ error: "teamId is required" });
    const team = await getTeam(teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });
    const ad = await advertiseTeam(currentUsn, team.id);
    if (!ad)
      return res.status(409).json({ error: "Already advertising this team" });
    return res.status(201).json({ advertisement: ad });
  } catch (err) {
    return res.status(500).json({ error: "Advertise team failed" });
  }
});

// DELETE /api/advertisements/:adId  -> "deadvertise"
router.delete("/:adId", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const adId = Number(req.params.adId);
    const ad = await Advertisement.findOne({ id: adId }).lean();
    if (!ad) return res.status(404).json({ error: "Advertisement not found" });
    if (ad.advertiserUSN !== currentUsn) {
      return res.status(403).json({ error: "Not your advertisement" });
    }
    await deleteAdvertisement(adId);
    return res.status(200).json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: "Delete advertisement failed" });
  }
});

module.exports = router;
