const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');

// This one uses proxy token (less strict than real API key)
router.post('/', async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const newAnalytics = new Analytics({ event, data });
    await newAnalytics.save();

    res.status(201).json({ message: 'Analytics event logged' });
  } catch (err) {
    console.error('Proxy analytics error:', err);
    res.status(500).json({ error: 'Failed to log analytics' });
  }
});

module.exports = router;
