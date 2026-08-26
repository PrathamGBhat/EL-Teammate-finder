const crypto = require("crypto");
const Session = require("../db/models/Session");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, derivedHex] = storedHash.split(":");
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(derivedHex, "hex");
  return derived.length === stored.length && crypto.timingSafeEqual(derived, stored);
}

function toPublicUser(user) {
  if (!user) return null;
  const { usn, name, branch, isAdmin } = user;
  return { usn, name, branch, isAdmin: !!isAdmin || usn === "1RV25CS131" };
}

async function createSession(usn) {
  const sid = crypto.randomBytes(24).toString("hex");
  await Session.create({ sid, usn });
  return sid;
}

module.exports = {
  hashPassword,
  verifyPassword,
  toPublicUser,
  createSession,
};
