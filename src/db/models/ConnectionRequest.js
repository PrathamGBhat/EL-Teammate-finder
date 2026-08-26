const mongoose = require("mongoose");

const ConnectionRequestSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
});

module.exports = mongoose.models.ConnectionRequest || mongoose.model("ConnectionRequest", ConnectionRequestSchema);
