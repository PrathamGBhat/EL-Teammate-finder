const mongoose = require("mongoose");

const AdvertisementSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  advertiserUSN: { type: String, required: true },
  teamId: { type: Number, required: true },
});

module.exports = mongoose.models.Advertisement || mongoose.model("Advertisement", AdvertisementSchema);
