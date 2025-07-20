const express = require('express');
const router = express.Router();
const CrashReport = require('../models/CrashReport');
const verifyApiKey = require('../middleware/auth'); // ✅ import

router.use(verifyApiKey); // ✅ apply middleware to all movie routes

// POST /api/crashes → save a crash
router.post('/', async (req, res) => {
  try {
    const crash = new CrashReport({
      message: req.body.message,
      stackTrace: req.body.stackTrace,
      platform: req.body.platform,
      appVersion: req.body.appVersion
    });

    await crash.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving crash:', error);
    res.status(500).json({ error: 'Failed to save crash report.' });
  }
});

// GET /api/crashes → fetch all crashes
router.get('/', async (req, res) => {
  const crashes = await CrashReport.find().sort({ createdAt: -1 });
  res.json(crashes);
});

module.exports = router;
