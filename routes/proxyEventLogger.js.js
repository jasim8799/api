const express = require('express');
const router = express.Router();
const ProxyAnalytics = require('../models/ProxyAnalytics');

// POST /api/proxy-events
router.post('/', async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    const log = new ProxyAnalytics({ event, data });
    await log.save();

    res.status(201).json({ message: 'Event logged successfully' });
  } catch (err) {
    console.error('❌ Proxy Event Logging Error:', err);
    res.status(500).json({ error: 'Server error while logging event' });
  }
});

module.exports = router;
