const mongoose = require("mongoose");

const AnalyticsEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // optional payload
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
