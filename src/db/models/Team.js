const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  leaderUSN: { type: String, required: true },
  requiredBranch: { type: String, required: true },
  membersNeeded: { type: Number, required: true },
  members: { type: [String], default: [] },
  status: { type: String, enum: ["OPEN", "COMPLETE"], default: "OPEN" },
});

module.exports = mongoose.models.Team || mongoose.model("Team", TeamSchema);
