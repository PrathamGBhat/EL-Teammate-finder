const express = require("express");
const router = express.Router();
const {
  connections,
  connectionRequests,
  getNextRequestId,
} = require("../db/store");
const { getUser, areConnected, getConnectionsOf } = require("../db/access");
const { toPublicUser } = require("../utils/auth");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/connections -> my accepted connections
router.get("/", (req, res) => {
  return res.status(200).json({ connections: getConnectionsOf(req.currentUsn) });
});

// GET /api/connections/requests -> requests sent to me, pending
router.get("/requests", (req, res) => {
  const currentUsn = req.currentUsn;
  const incoming = connectionRequests
    .filter((r) => r.to === currentUsn && r.status === "pending")
    .map((r) => ({ ...r, fromUser: toPublicUser(getUser(r.from)) }));
  return res.status(200).json({ requests: incoming });
});

// POST /api/connections/request  { to }
router.post("/request", (req, res) => {
  const currentUsn = req.currentUsn;
  const { to } = req.body || {};
  if (!to) return res.status(400).json({ error: "to is required" });
  if (to === currentUsn) return res.status(400).json({ error: "Cannot connect to yourself" });
  if (!getUser(to)) return res.status(404).json({ error: "USN not found" });
  if (areConnected(currentUsn, to)) return res.status(409).json({ error: "Already connected" });
  if (
    connectionRequests.some(
      (r) => r.from === currentUsn && r.to === to && r.status === "pending"
    )
  ) {
    return res.status(409).json({ error: "Request already pending" });
  }
  const request = { id: getNextRequestId(), from: currentUsn, to, status: "pending" };
  connectionRequests.push(request);
  return res.status(201).json({ request });
});

// POST /api/connections/:requestId/accept
router.post("/:requestId/accept", (req, res) => {
  const currentUsn = req.currentUsn;
  const request = connectionRequests.find((r) => r.id === Number(req.params.requestId));
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.to !== currentUsn) return res.status(403).json({ error: "Not your request to accept" });
  request.status = "accepted";
  connections.push({ a: request.from, b: request.to });
  return res.status(200).json({ request });
});

// POST /api/connections/:requestId/reject
router.post("/:requestId/reject", (req, res) => {
  const currentUsn = req.currentUsn;
  const request = connectionRequests.find((r) => r.id === Number(req.params.requestId));
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.to !== currentUsn) return res.status(403).json({ error: "Not your request to reject" });
  request.status = "rejected";
  return res.status(200).json({ request });
});

module.exports = router;
