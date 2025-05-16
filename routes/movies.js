const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');

// POST a movie
router.post('/', async (req, res) => {
  try {
    const {
      title, overview, category, region, type,
      posterPath, videoUrl, releaseDate, voteAverage
    } = req.body;

    const newMovie = new Movie({
      title,
      overview,
      category,
      region, // add region
      type,
      posterPath,
      videoUrl,
      releaseDate,
      voteAverage,
    });

    await newMovie.save();
    res.status(201).json({ message: 'Movie uploaded successfully', movie: newMovie });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload movie' });
  }
});

// GET all movies or by category and region
router.get('/', async (req, res) => {
  try {
    const { type, category, region } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (category && category !== 'All') filter.category = category;
    if (region && region !== 'All') filter.region = region;

    const movies = await Movie.find(filter);
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update movie
router.put('/:id', async (req, res) => {
  try {
    const updated = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a movie
router.delete('/:id', async (req, res) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/category/:category', async (req, res) => {
  const category = req.params.category;

  try {
    const movies = await Movie.find({ category });
    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
