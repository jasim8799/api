const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');

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

    const episodes = await Episode.find({ seriesId }).sort({ episodeNumber: 1 });
    res.json(episodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
