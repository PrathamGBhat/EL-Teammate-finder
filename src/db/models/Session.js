const mongoose = require("mongoose");
const { SESSION_MAX_AGE_SECONDS } = require("../../config/constants");

const SessionSchema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true, index: true },
  usn: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: SESSION_MAX_AGE_SECONDS },
});

module.exports = mongoose.models.Session || mongoose.model("Session", SessionSchema);
