const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');

// POST a movie
router.post('/', async (req, res) => {
  try {
    const movie = new Movie(req.body);
    await movie.save();
    res.status(201).json({ movie: movie });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all movies or by category
router.get('/', async (req, res) => {
  const { category } = req.query;
  try {
    const filter = category ? { category } : {};
    const movies = await Movie.find(filter);
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

module.exports = router;
