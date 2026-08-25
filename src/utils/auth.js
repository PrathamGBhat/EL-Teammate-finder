const crypto = require("crypto");
const { sessions } = require("../db/store");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, derivedHex] = storedHash.split(":");
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(derivedHex, "hex");
  return derived.length === stored.length && crypto.timingSafeEqual(derived, stored);
}

function toPublicUser(user) {
  if (!user) return null;
  const { usn, name, branch } = user;
  return { usn, name, branch };
}

function createSession(usn) {
  const sid = crypto.randomBytes(24).toString("hex");
  sessions.set(sid, usn);
  return sid;
}

module.exports = {
  hashPassword,
  verifyPassword,
  toPublicUser,
  createSession,
};
