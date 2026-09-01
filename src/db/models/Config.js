const mongoose = require("mongoose");

const ConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
});

module.exports = mongoose.models.Config || mongoose.model("Config", ConfigSchema);
