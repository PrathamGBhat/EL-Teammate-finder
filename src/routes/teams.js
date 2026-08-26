const express = require("express");
const router = express.Router();
const Team = require("../db/models/Team");
const { getNextSequence } = require("../db/models/Counter");
const { getTeam, advertiseTeam } = require("../db/access");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/teams?open=1&mine=1
router.get("/", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const filter = {};
    if (req.query.open) filter.status = "OPEN";
    if (req.query.mine) filter.leaderUSN = currentUsn;
    const list = await Team.find(filter).lean();
    return res.status(200).json({ teams: list });
  } catch (err) {
    return res.status(500).json({ error: "Fetch teams failed" });
  }
});

// POST /api/teams  { requiredBranch, membersNeeded }
router.post("/", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const { requiredBranch, membersNeeded } = req.body || {};
    if (!requiredBranch || !membersNeeded) {
      return res
        .status(400)
        .json({ error: "requiredBranch and membersNeeded are required" });
    }
    const teamId = await getNextSequence("teamId");
    const team = await Team.create({
      id: teamId,
      leaderUSN: currentUsn,
      requiredBranch: String(requiredBranch).toUpperCase(),
      membersNeeded: Number(membersNeeded),
      members: [currentUsn],
      status: "OPEN",
    });
    // Auto-advertise under the leader's own profile
    await advertiseTeam(currentUsn, team.id);
    return res.status(201).json({ team: team.toObject() });
  } catch (err) {
    return res.status(500).json({ error: "Create team failed" });
  }
});

// POST /api/teams/:teamId/complete
router.post("/:teamId/complete", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const team = await Team.findOne({ id: Number(req.params.teamId) });
    if (!team) return res.status(404).json({ error: "Team not found" });
    if (team.leaderUSN !== currentUsn) {
      return res
        .status(403)
        .json({ error: "Only the leader can mark this complete" });
    }
    team.status = "COMPLETE";
    await team.save();
    return res.status(200).json({ team: team.toObject() });
  } catch (err) {
    return res.status(500).json({ error: "Complete team failed" });
  }
});

module.exports = router;
