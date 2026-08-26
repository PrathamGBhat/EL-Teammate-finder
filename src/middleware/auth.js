const Session = require("../db/models/Session");
const { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } = require("../config/constants");

async function getSessionUser(req) {
  const sid = req.cookies && req.cookies[SESSION_COOKIE];
  if (!sid) return null;
  const session = await Session.findOne({ sid }).lean();
  return session ? session.usn : null;
}

async function requireAuth(req, res, next) {
  try {
    const usn = await getSessionUser(req);
    if (!usn) {
      return res.status(401).json({ error: "Not logged in" });
    }
    req.currentUsn = usn;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Authentication check failed" });
  }
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
