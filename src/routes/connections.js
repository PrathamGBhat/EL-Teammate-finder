const express = require("express");
const router = express.Router();
const Connection = require("../db/models/Connection");
const ConnectionRequest = require("../db/models/ConnectionRequest");
const User = require("../db/models/User");
const { getNextSequence } = require("../db/models/Counter");
const { getUser, areConnected, getConnectionsOf } = require("../db/access");
const { toPublicUser } = require("../utils/auth");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/connections -> my accepted connections
router.get("/", async (req, res) => {
  try {
    const connections = await getConnectionsOf(req.currentUsn);
    return res.status(200).json({ connections });
  } catch (err) {
    return res.status(500).json({ error: "Fetch connections failed" });
  }
});

// GET /api/connections/requests -> requests sent to me, pending
router.get("/requests", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const requests = await ConnectionRequest.find({
      to: currentUsn,
      status: "pending",
    }).lean();
    const fromUsns = requests.map((r) => r.from);
    const users = await User.find({ usn: { $in: fromUsns } }).lean();
    const userMap = new Map(users.map((u) => [u.usn, u]));

    const incoming = requests.map((r) => ({
      ...r,
      fromUser: toPublicUser(userMap.get(r.from)),
    }));
    return res.status(200).json({ requests: incoming });
  } catch (err) {
    return res.status(500).json({ error: "Fetch connection requests failed" });
  }
});

// POST /api/connections/request  { to }
router.post("/request", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const { to } = req.body || {};
    if (!to) return res.status(400).json({ error: "to is required" });
    if (to === currentUsn)
      return res.status(400).json({ error: "Cannot connect to yourself" });
    if (!(await getUser(to)))
      return res.status(404).json({ error: "USN not found" });
    if (await areConnected(currentUsn, to))
      return res.status(409).json({ error: "Already connected" });

    const pendingReq = await ConnectionRequest.findOne({
      from: currentUsn,
      to,
      status: "pending",
    }).lean();
    if (pendingReq) {
      return res.status(409).json({ error: "Request already pending" });
    }

    const requestId = await getNextSequence("requestId");
    const request = await ConnectionRequest.create({
      id: requestId,
      from: currentUsn,
      to,
      status: "pending",
    });
    return res.status(201).json({ request: request.toObject() });
  } catch (err) {
    return res.status(500).json({ error: "Send connection request failed" });
  }
});

// POST /api/connections/:requestId/accept
router.post("/:requestId/accept", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const numId = Number(req.params.requestId);
    const request = await ConnectionRequest.findOne({ id: numId });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.to !== currentUsn)
      return res.status(403).json({ error: "Not your request to accept" });

    request.status = "accepted";
    await request.save();

    await Connection.updateOne(
      { a: request.from, b: request.to },
      { a: request.from, b: request.to },
      { upsert: true }
    );
    return res.status(200).json({ request: request.toObject() });
  } catch (err) {
    return res.status(500).json({ error: "Accept request failed" });
  }
});

// POST /api/connections/:requestId/reject
router.post("/:requestId/reject", async (req, res) => {
  try {
    const currentUsn = req.currentUsn;
    const numId = Number(req.params.requestId);
    const request = await ConnectionRequest.findOne({ id: numId });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.to !== currentUsn)
      return res.status(403).json({ error: "Not your request to reject" });

    request.status = "rejected";
    await request.save();
    return res.status(200).json({ request: request.toObject() });
  } catch (err) {
    return res.status(500).json({ error: "Reject request failed" });
  }
});

module.exports = router;
