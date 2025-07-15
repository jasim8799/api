const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define schema
const analyticsSchema = new mongoose.Schema({
  event: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create model
const Analytics = mongoose.model('Analytics', analyticsSchema);

// POST /api/analytics/track
router.post('/track', async (req, res) => {
  try {
    const data = req.body;
    const newEvent = await Analytics.create(data);
    res.json({ success: true, event: newEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save analytics' });
  }
});

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const events = await Analytics.find().sort({ timestamp: -1 }).limit(200);
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
