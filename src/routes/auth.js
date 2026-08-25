const express = require("express");
const router = express.Router();
const { users, sessions } = require("../db/store");
const { getUser } = require("../db/access");
const {
  hashPassword,
  verifyPassword,
  toPublicUser,
  createSession,
} = require("../utils/auth");
const {
  getSessionUser,
  sessionCookieOptions,
  clearCookieOptions,
} = require("../middleware/auth");
const { SESSION_COOKIE } = require("../config/constants");

// POST /api/signup  { usn, name, branch, password }
router.post("/signup", (req, res) => {
  const { usn, name, branch, password } = req.body || {};
  if (!usn || !name || !branch || !password) {
    return res.status(400).json({ error: "usn, name, branch and password are all required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  if (getUser(usn)) {
    return res.status(409).json({ error: "That USN is already registered — log in instead" });
  }
  const user = { usn, name, branch, passwordHash: hashPassword(password) };
  users.set(usn, user);
  const sid = createSession(usn);
  res.cookie(SESSION_COOKIE, sid, sessionCookieOptions);
  return res.status(201).json({ user: toPublicUser(user) });
});

// POST /api/login  { usn, password }
router.post("/login", (req, res) => {
  const { usn, password } = req.body || {};
  if (!usn || !password) {
    return res.status(400).json({ error: "usn and password are required" });
  }

  const user = getUser(usn);
  if (!user) {
    return res.status(404).json({ error: "No account with that USN yet", isNewUser: true });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Incorrect password" });
  }
  const sid = createSession(usn);
  res.cookie(SESSION_COOKIE, sid, sessionCookieOptions);
  return res.status(200).json({ user: toPublicUser(user) });
});

// POST /api/logout
router.post("/logout", (req, res) => {
  const sid = req.cookies && req.cookies[SESSION_COOKIE];
  if (sid) {
    sessions.delete(sid);
  }
  res.cookie(SESSION_COOKIE, "", clearCookieOptions);
  return res.status(200).json({ ok: true });
});

// GET /api/me
router.get("/me", (req, res) => {
  const usn = getSessionUser(req);
  if (!usn) return res.status(401).json({ error: "Not logged in" });
  const user = getUser(usn);
  if (!user) return res.status(401).json({ error: "Not logged in" });
  return res.status(200).json({ user: toPublicUser(user) });
});

module.exports = router;
