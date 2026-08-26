const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  usn: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  branch: { type: String, required: true },
  passwordHash: { type: String, required: true },
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
