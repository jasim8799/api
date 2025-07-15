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

/**
 * POST /api/analytics/track
 * Save a new event
 */
router.post('/track', async (req, res) => {
  try {
    const data = req.body;
    const newEvent = await Analytics.create({
      event: data.event,
      details: data.details || {},
    });
    res.json({ success: true, event: newEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save analytics' });
  }
});

/**
 * GET /api/analytics
 * List recent events
 */
router.get('/', async (req, res) => {
  try {
    const events = await Analytics.find().sort({ timestamp: -1 }).limit(200);
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/summary
 * Return summary stats for admin dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const totalInstalls = await Analytics.countDocuments({ event: 'install' });
    const totalViews = await Analytics.countDocuments({ event: 'movie_viewed' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayViews = await Analytics.countDocuments({
      event: 'movie_viewed',
      timestamp: { $gte: today }
    });

    res.json({
      totalInstalls,
      totalViews,
      todayViews
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
