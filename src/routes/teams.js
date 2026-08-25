const express = require("express");
const router = express.Router();
const { teams, getNextTeamId } = require("../db/store");
const { getTeam, advertiseTeam } = require("../db/access");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/teams?open=1&mine=1
router.get("/", (req, res) => {
  const currentUsn = req.currentUsn;
  let list = teams;
  if (req.query.open) list = list.filter((t) => t.status === "OPEN");
  if (req.query.mine) list = list.filter((t) => t.leaderUSN === currentUsn);
  return res.status(200).json({ teams: list });
});

// POST /api/teams  { requiredBranch, membersNeeded }
router.post("/", (req, res) => {
  const currentUsn = req.currentUsn;
  const { requiredBranch, membersNeeded } = req.body || {};
  if (!requiredBranch || !membersNeeded) {
    return res.status(400).json({ error: "requiredBranch and membersNeeded are required" });
  }
  const team = {
    id: getNextTeamId(),
    leaderUSN: currentUsn,
    requiredBranch: String(requiredBranch).toUpperCase(),
    membersNeeded: Number(membersNeeded),
    members: [currentUsn],
    status: "OPEN",
  };
  teams.push(team);
  // Auto-advertise under the leader's own profile so it's immediately
  // discoverable by the leader's connections — no extra step needed.
  advertiseTeam(currentUsn, team.id);
  return res.status(201).json({ team });
});

// POST /api/teams/:teamId/complete
router.post("/:teamId/complete", (req, res) => {
  const currentUsn = req.currentUsn;
  const team = getTeam(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  if (team.leaderUSN !== currentUsn) {
    return res.status(403).json({ error: "Only the leader can mark this complete" });
  }
  team.status = "COMPLETE";
  return res.status(200).json({ team });
});

module.exports = router;
