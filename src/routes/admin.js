const express = require("express");
const router = express.Router();
const User = require("../db/models/User");
const Session = require("../db/models/Session");
const Connection = require("../db/models/Connection");
const ConnectionRequest = require("../db/models/ConnectionRequest");
const Team = require("../db/models/Team");
const Advertisement = require("../db/models/Advertisement");
const { hashPassword, toPublicUser } = require("../utils/auth");
const { requireAdmin } = require("../middleware/auth");

// All admin routes require admin privileges
router.use(requireAdmin);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/admin/users?q=
router.get("/users", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    let filter = {};
    if (q) {
      const escapedQ = escapeRegex(q);
      filter = {
        $or: [
          { usn: { $regex: "^" + escapedQ, $options: "i" } },
          { name: { $regex: escapedQ, $options: "i" } },
          { branch: { $regex: "^" + escapedQ, $options: "i" } },
        ],
      };
    }
    const users = await User.find(filter).sort({ usn: 1 }).lean();
    return res.status(200).json({ users: users.map(toPublicUser) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/admin/users (Create user)
router.post("/users", async (req, res) => {
  try {
    let { usn, name, branch, password, isAdmin } = req.body || {};
    usn = (usn || "").trim().toUpperCase();
    name = (name || "").trim();
    branch = (branch || "").trim().toUpperCase();

    if (!usn || !name || !branch || !password) {
      return res.status(400).json({ error: "USN, Name, Branch, and Password are all required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ usn }).lean();
    if (existing) {
      return res.status(409).json({ error: "A user with that USN already exists" });
    }

    const user = await User.create({
      usn,
      name,
      branch,
      passwordHash: hashPassword(password),
      isAdmin: Boolean(isAdmin),
    });

    return res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to create user" });
  }
});

// PUT /api/admin/users/:usn (Update user)
router.put("/users/:usn", async (req, res) => {
  try {
    const targetUsn = req.params.usn.toUpperCase();
    let { name, branch, password, isAdmin } = req.body || {};

    const user = await User.findOne({ usn: targetUsn });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (branch && branch.trim()) {
      user.branch = branch.trim().toUpperCase();
    }
    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      user.passwordHash = hashPassword(password.trim());
    }
    if (isAdmin !== undefined) {
      user.isAdmin = Boolean(isAdmin);
    }

    await user.save();
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to update user" });
  }
});

// DELETE /api/admin/users/:usn (Delete user & cleanup related records)
router.delete("/users/:usn", async (req, res) => {
  try {
    const targetUsn = req.params.usn.toUpperCase();

    const user = await User.findOne({ usn: targetUsn });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Cascade deletion of user resources across collections
    await Promise.all([
      User.deleteOne({ usn: targetUsn }),
      Session.deleteMany({ usn: targetUsn }),
      Connection.deleteMany({ $or: [{ a: targetUsn }, { b: targetUsn }] }),
      ConnectionRequest.deleteMany({ $or: [{ from: targetUsn }, { to: targetUsn }] }),
      Team.deleteMany({ leaderUSN: targetUsn }),
      Advertisement.deleteMany({ advertiserUSN: targetUsn }),
    ]);

    return res.status(200).json({ deleted: true, usn: targetUsn });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET /api/admin/teams?q= (Fetch global teams list)
router.get("/teams", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    let filter = {};
    if (q) {
      const escapedQ = escapeRegex(q);
      const isNum = !isNaN(Number(q));
      filter = {
        $or: [
          ...(isNum ? [{ id: Number(q) }] : []),
          { leaderUSN: { $regex: "^" + escapedQ, $options: "i" } },
          { requiredBranch: { $regex: "^" + escapedQ, $options: "i" } },
          { status: { $regex: "^" + escapedQ, $options: "i" } },
        ],
      };
    }
    const teams = await Team.find(filter).sort({ id: -1 }).lean();
    return res.status(200).json({ teams });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// POST /api/admin/teams/:id/toggle-status (Toggle team OPEN / COMPLETE)
router.post("/teams/:id/toggle-status", async (req, res) => {
  try {
    const teamId = Number(req.params.id);
    const team = await Team.findOne({ id: teamId });
    if (!team) return res.status(404).json({ error: "Team requirement not found" });

    team.status = team.status === "OPEN" ? "COMPLETE" : "OPEN";
    await team.save();
    return res.status(200).json({ team: team.toObject() });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update team status" });
  }
});

// DELETE /api/admin/teams/:id (Delete team & associated advertisements)
router.delete("/teams/:id", async (req, res) => {
  try {
    const teamId = Number(req.params.id);
    const team = await Team.findOne({ id: teamId });
    if (!team) return res.status(404).json({ error: "Team requirement not found" });

    await Promise.all([
      Team.deleteOne({ id: teamId }),
      Advertisement.deleteMany({ teamId }),
    ]);

    return res.status(200).json({ deleted: true, teamId });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete team requirement" });
  }
});

module.exports = router;
