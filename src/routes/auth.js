const express = require("express");
const router = express.Router();
const User = require("../db/models/User");
const Session = require("../db/models/Session");
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

const USN_REGEX = /^1(RV|RZ)\d{2}(CS|CD|CY|CI|CH|IS|BT|EC|EE|ET|CV|ME|AS|IM)\d{3}$/i;

// POST /api/signup  { usn, name, branch, password }
router.post("/signup", async (req, res) => {
  try {
    const { usn, name, branch, password } = req.body || {};
    if (!usn || !name || !branch || !password) {
      return res
        .status(400)
        .json({ error: "usn, name, branch and password are all required" });
    }
    const normalizedUsn = String(usn).trim().toUpperCase();
    if (!USN_REGEX.test(normalizedUsn)) {
      return res
        .status(400)
        .json({ error: "Invalid USN format. Must be e.g. 1RV25CS001 or 1RZ24EC042." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }
    if (await getUser(normalizedUsn)) {
      return res
        .status(409)
        .json({ error: "That USN is already registered — log in instead" });
    }
    const user = await User.create({
      usn: normalizedUsn,
      name,
      branch,
      passwordHash: hashPassword(password),
    });
    const sid = await createSession(normalizedUsn);
    res.cookie(SESSION_COOKIE, sid, sessionCookieOptions);
    return res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Signup failed" });
  }
});

// POST /api/login  { usn, password }
router.post("/login", async (req, res) => {
  try {
    const { usn, password } = req.body || {};
    if (!usn || !password) {
      return res.status(400).json({ error: "usn and password are required" });
    }

    const normalizedUsn = String(usn).trim().toUpperCase();
    if (!USN_REGEX.test(normalizedUsn)) {
      return res
        .status(400)
        .json({ error: "Invalid USN format. Must be e.g. 1RV25CS001 or 1RZ24EC042." });
    }

    const user = await getUser(normalizedUsn);
    if (!user) {
      return res
        .status(404)
        .json({ error: "No account with that USN yet", isNewUser: true });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    const sid = await createSession(normalizedUsn);
    res.cookie(SESSION_COOKIE, sid, sessionCookieOptions);
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});

// POST /api/logout
router.post("/logout", async (req, res) => {
  try {
    const sid = req.cookies && req.cookies[SESSION_COOKIE];
    if (sid) {
      await Session.deleteOne({ sid });
    }
    res.cookie(SESSION_COOKIE, "", clearCookieOptions);
    return res.status(200).json({ ok: true });
  } catch (err) {
    res.cookie(SESSION_COOKIE, "", clearCookieOptions);
    return res.status(200).json({ ok: true });
  }
});

// GET /api/me
router.get("/me", async (req, res) => {
  try {
    const usn = await getSessionUser(req);
    if (!usn) return res.status(401).json({ error: "Not logged in" });
    const user = await getUser(usn);
    if (!user) return res.status(401).json({ error: "Not logged in" });
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (err) {
    return res.status(401).json({ error: "Not logged in" });
  }
});

module.exports = router;
