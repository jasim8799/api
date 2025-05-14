const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');

// POST: Upload movie
router.post('/', async (req, res) => {
  try {
    const newMovie = new Movie(req.body);
    await newMovie.save();
    res.status(201).json({ message: 'Movie uploaded successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET: Fetch all movies
router.get('/', async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
