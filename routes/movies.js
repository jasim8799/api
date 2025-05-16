const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
  
// POST: Upload movie using poster URL
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
