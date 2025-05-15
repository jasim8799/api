const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const multer = require('multer');
const path = require('path');

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/posters/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // Unique filename
  }
});
const upload = multer({ storage });

// POST: Upload movie with poster
router.post('/', upload.single('poster'), async (req, res) => {
  try {
    const { title, overview, releaseDate, voteAverage, videoUrl, category, type } = req.body;

    const posterPath = req.file ? `/uploads/posters/${req.file.filename}` : '';

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
