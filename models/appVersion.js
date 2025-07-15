const mongoose = require('mongoose');

const appVersionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true
  },
  changelog: {
    type: String,
    required: true
  },
  mandatory: {
    type: Boolean,
    required: true
  },
  platform: {
    type: String,
    enum: ['android', 'ios'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AppVersion', appVersionSchema);
