const mongoose = require('mongoose');

const proxyAnalyticsSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ProxyAnalytics', proxyAnalyticsSchema);
