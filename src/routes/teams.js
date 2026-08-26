const express = require("express");
const router = express.Router();
const Team = require("../db/models/Team");
const Advertisement = require("../db/models/Advertisement");
const { getNextSequence } = require("../db/models/Counter");
const { getTeam, advertiseTeam, getConnectionsOf } = require("../db/access");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/teams?open=1&mine=1
router.get("/", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const filter = {};
    if (req.query.open) filter.status = "OPEN";

    if (req.query.mine) {
      filter.leaderUSN = currentUsn;
    } else if (req.query.open) {
      // Only show open requirements created by the current user OR led by their direct accepted connections
      const connections = await getConnectionsOf(currentUsn);
      const connectedUsns = connections.map((c) => c.usn);
      filter.leaderUSN = { $in: [currentUsn, ...connectedUsns] };
    }

    const list = await Team.find(filter).sort({ id: -1 }).lean();
    return res.status(200).json({ teams: list });
  } catch (err) {
    return res.status(500).json({ error: "Fetch teams failed" });
  }
});

// POST /api/teams  { requiredBranch, membersNeeded, contactPhone }
router.post("/", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const { requiredBranch, membersNeeded, contactPhone } = req.body || {};
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
      contactPhone: String(contactPhone || "").trim(),
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
    const teamId = Number(req.params.teamId);
    const team = await Team.findOne({ id: teamId });
    if (!team) return res.status(404).json({ error: "Team not found" });
    if (team.leaderUSN !== currentUsn) {
      return res
        .status(403)
        .json({ error: "Only the leader can mark this complete" });
    }
    team.status = "COMPLETE";
    await team.save();

    // Automatically remove all advertisements referencing this team requirement
    await Advertisement.deleteMany({ teamId });

    return res.status(200).json({ team: team.toObject() });
  } catch (err) {
    return res.status(500).json({ error: "Complete team failed" });
  }
});

module.exports = router;
