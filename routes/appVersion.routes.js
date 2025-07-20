const express = require('express');
const router = express.Router();
const AppVersion = require('../models/appVersion');
const verifyApiKey = require('../middleware/auth'); // ✅ import

router.use(verifyApiKey); // ✅ apply middleware to all movie routes

// GET /api/app/version
router.get('/version', async (req, res) => {
  try {
    const latest = await AppVersion
      .findOne({ platform: 'android' })
      .sort({ createdAt: -1 });

    if (!latest) {
      return res.status(404).json({ message: 'Version not found' });
    }

    res.json(latest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
