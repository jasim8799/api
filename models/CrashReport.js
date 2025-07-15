const mongoose = require('mongoose');

const crashReportSchema = new mongoose.Schema({
  message: String,
  stackTrace: String,
  platform: String,
  appVersion: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CrashReport', crashReportSchema);
