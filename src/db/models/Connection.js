const mongoose = require("mongoose");

const ConnectionSchema = new mongoose.Schema({
  a: { type: String, required: true },
  b: { type: String, required: true },
});

ConnectionSchema.index({ a: 1, b: 1 }, { unique: true });

module.exports = mongoose.models.Connection || mongoose.model("Connection", ConnectionSchema);
