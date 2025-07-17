const express = require('express');
const router = express.Router();
const Analytics = require('../models/analytics');
const Crash = require('../models/crash');

// POST /api/analytics/track
router.post('/track', async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event) {
      return res.status(400).json({ message: 'Event type is required.' });
    }

    const analytics = new Analytics({
      event,
      data,
      timestamp: new Date(),
    });

    await analytics.save();
    res.status(201).json({ message: 'Analytics event tracked successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to track analytics event.', error });
  }
});

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    const totalInstalls = await Analytics.countDocuments({ event: 'app_install' });
    const totalViews = await Analytics.countDocuments({ event: 'movie_viewed' });
    const totalPlays = await Analytics.countDocuments({ event: 'movie_play' });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayViews = await Analytics.countDocuments({
      event: 'movie_viewed',
      timestamp: { $gte: startOfDay },
    });

    res.json({
      totalInstalls,
      totalViews,
      todayViews,
      totalPlays,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get analytics summary.', error });
  }
});

// POST /api/analytics/crash
router.post('/crash', async (req, res) => {
  try {
    const { message, stack, device } = req.body;

    const crash = new Crash({
      message,
      stack,
      device,
      timestamp: new Date(),
    });

    await crash.save();
    res.status(201).json({ message: 'Crash report submitted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit crash report.', error });
  }
});

// GET /api/analytics/crashes
router.get('/crashes', async (req, res) => {
  try {
    const crashes = await Crash.find().sort({ timestamp: -1 });
    res.json(crashes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch crashes.', error });
  }
});

module.exports = router;
