const express = require("express");
const router = express.Router();
const Team = require("../db/models/Team");
const User = require("../db/models/User");
const Advertisement = require("../db/models/Advertisement");
const { getNextSequence } = require("../db/models/Counter");
const { getTeam, advertiseTeam, getConnectionsOf } = require("../db/access");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/teams?open=1&mine=1&scope=network|global
router.get("/", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const filter = {};
    if (req.query.open) filter.status = "OPEN";

    if (req.query.mine) {
      filter.leaderUSN = currentUsn;
    } else if (req.query.open) {
      const scope = req.query.scope || "network";
      if (scope === "network") {
        // Only show open requirements created by current user OR led by direct accepted connections
        const connections = await getConnectionsOf(currentUsn);
        const connectedUsns = connections.map((c) => c.usn);
        filter.leaderUSN = { $in: [currentUsn, ...connectedUsns] };
      }
      // If scope === 'global', no leaderUSN filter is applied (returns all open teams)
    }

    const list = await Team.find(filter).sort({ id: -1 }).lean();
    if (list.length === 0) return res.status(200).json({ teams: [] });

    // Populate leaderName for display
    const leaderUsns = [...new Set(list.map((t) => t.leaderUSN))];
    const users = await User.find({ usn: { $in: leaderUsns } }).lean();
    const userMap = new Map(users.map((u) => [u.usn, u.name]));

    const teams = list.map((t) => {
      const branches = (t.requiredBranches && t.requiredBranches.length > 0)
        ? t.requiredBranches
        : [t.requiredBranch || "ANY"];
      return {
        ...t,
        requiredBranches: branches,
        requiredBranch: branches[0],
        leaderName: userMap.get(t.leaderUSN) || t.leaderUSN,
      };
    });

    return res.status(200).json({ teams });
  } catch (err) {
    return res.status(500).json({ error: "Fetch teams failed" });
  }
});

// POST /api/teams  { requiredBranches, requiredBranch, contactPhone, description }
router.post("/", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const { requiredBranches, requiredBranch, contactPhone, description } = req.body || {};

    let branches = [];
    if (Array.isArray(requiredBranches) && requiredBranches.length > 0) {
      branches = requiredBranches.map((b) => String(b).trim().toUpperCase()).filter(Boolean);
    } else if (requiredBranch) {
      branches = [String(requiredBranch).trim().toUpperCase()];
    }

    if (branches.length === 0) {
      return res.status(400).json({ error: "At least one required branch is required" });
    }

    const teamId = await getNextSequence("teamId");
    const team = await Team.create({
      id: teamId,
      leaderUSN: currentUsn,
      requiredBranch: branches[0],
      requiredBranches: branches,
      membersNeeded: branches.length,
      members: [currentUsn],
      status: "OPEN",
      contactPhone: String(contactPhone || "").trim(),
      description: String(description || "").trim().slice(0, 100),
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

    // Completely delete team requirement and all associated advertisements from MongoDB
    await Promise.all([
      Team.deleteOne({ id: teamId }),
      Advertisement.deleteMany({ teamId }),
    ]);

    return res.status(200).json({ deleted: true, teamId });
  } catch (err) {
    return res.status(500).json({ error: "Complete team failed" });
  }
});

module.exports = router;
