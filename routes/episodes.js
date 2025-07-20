const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Episode = require('../models/Episode');
const verifyApiKey = require('../middleware/auth'); // ✅ import

router.use(verifyApiKey); // ✅ apply middleware to all movie routes

// Add episode
router.post('/', async (req, res) => {
  try {
    const { seriesId, episodeNumber, title, overview, videoSources, releaseDate } = req.body;

    if (!seriesId || !episodeNumber || !title || !videoSources) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newEpisode = new Episode({ seriesId, episodeNumber, title, overview, videoSources, releaseDate });
    await newEpisode.save();

    res.status(201).json({ message: 'Episode added', episode: newEpisode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get episodes by seriesId
router.get('/', async (req, res) => {
  try {
    const { seriesId } = req.query;
    if (!seriesId) return res.status(400).json({ error: 'seriesId query param required' });

    // Validate seriesId is a 24-character hex string
    const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(seriesId);
    if (!isValidObjectId) {
      return res.status(400).json({ error: 'Invalid seriesId format: must be a 24-character hex string' });
    }

const objectId = new mongoose.Types.ObjectId(seriesId);

    const episodes = await Episode.find({ seriesId: objectId }).sort({ episodeNumber: 1 });
    res.json(episodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/titles', async (req, res) => {
  try {
    const { seriesId } = req.query;
    if (!seriesId) return res.status(400).json({ error: 'seriesId query param required' });

    const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(seriesId);
    if (!isValidObjectId) {
      return res.status(400).json({ error: 'Invalid seriesId format' });
    }

    const objectId = new mongoose.Types.ObjectId(seriesId);

    const episodes = await Episode.find({ seriesId: objectId }, '_id title').sort({ episodeNumber: 1 });

    res.status(200).json(episodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/ping', (req, res) => {
  res.send('Episodes API is alive');
});

module.exports = router;
