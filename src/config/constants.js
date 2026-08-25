const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "../../public");
const SESSION_COOKIE = process.env.SESSION_COOKIE || "sid";
const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS) || 60 * 60 * 24 * 7; // default 7 days

module.exports = {
  PORT,
  PUBLIC_DIR,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
};
