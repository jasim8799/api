const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');

// GET: Fetch all movies
router.get('/', async (req, res) => {
  try {
    const movies = await Movie.find().sort({ releaseDate: -1 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// ✅ GET: Fetch only series
router.get('/series', async (req, res) => {
  try {
    const series = await Movie.find({ type: 'series' }).sort({ releaseDate: -1 });
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// ✅ GET: Fetch only movies (not series)
router.get('/movies-only', async (req, res) => {
  try {
    const movies = await Movie.find({ type: 'movie' }).sort({ releaseDate: -1 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movies only' });
  }
});

// POST: Upload movie or series
router.post('/', async (req, res) => {
  try {
    const { title, overview, releaseDate, voteAverage, videoUrl, category, type, posterPath } = req.body;

    if (!posterPath) {
      return res.status(400).json({ error: 'posterPath is required.' });
    }

    const newMovie = new Movie({
      title,
      overview,
      releaseDate,
      voteAverage: parseFloat(voteAverage),
      videoUrl,
      category,
      type,
      posterPath
    });

    await newMovie.save();
    res.status(201).json({ message: 'Movie uploaded successfully', movie: newMovie });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
