const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "../../public");
const SESSION_COOKIE = "sid";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

module.exports = {
  PORT,
  PUBLIC_DIR,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
};
