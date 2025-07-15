const mongoose = require('mongoose');

const appStatsSchema = new mongoose.Schema({
  totalInstalls: { type: Number, default: 0 },
  totalVisits: { type: Number, default: 0 },
  todayVisits: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },

  // optional extra fields:
  totalMoviePlays: { type: Number, default: 0 }
});

module.exports = mongoose.model('AppStats', appStatsSchema);
