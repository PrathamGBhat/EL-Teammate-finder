const { sessions } = require("../db/store");
const { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } = require("../config/constants");

function getSessionUser(req) {
  const sid = req.cookies && req.cookies[SESSION_COOKIE];
  if (!sid) return null;
  return sessions.get(sid) || null;
}

function requireAuth(req, res, next) {
  const usn = getSessionUser(req);
  if (!usn) {
    return res.status(401).json({ error: "Not logged in" });
  }
  req.currentUsn = usn;
  next();
}

const sessionCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  maxAge: SESSION_MAX_AGE_SECONDS * 1000,
};

const clearCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  maxAge: 0,
};

module.exports = {
  getSessionUser,
  requireAuth,
  sessionCookieOptions,
  clearCookieOptions,
};
