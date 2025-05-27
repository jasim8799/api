const express = require('express');
const router = express.Router();
const { body, validationResult, query, param } = require('express-validator');
const Movie = require('../models/Movie');

// Helper middleware to check validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST create a new movie
router.post(
  '/',
  [
    body('title').isString().notEmpty(),
    body('overview').isString().notEmpty(),
    body('posterPath').isURL(),
    body('releaseDate').isISO8601(), // valid date string
    body('voteAverage').isNumeric(),
    body('category').isString().notEmpty(),
    body('region').isIn(['Hollywood', 'Bollywood']),
    body('type').optional().isString(),
    body('videoLinks').isArray({ min: 1 }),
    body('videoLinks.*.quality').isString().notEmpty(),
    body('videoLinks.*.language').isString().notEmpty(),
    body('videoLinks.*.url').isURL()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        title,
        overview,
        category,
        region,
        type,
        posterPath,
        videoLinks,
        releaseDate,
        voteAverage
      } = req.body;

      const newMovie = new Movie({
        title,
        overview,
        category,
        region,
        type: type ? type.toLowerCase() : 'movie',
        posterPath,
        videoLinks,
        releaseDate,
        voteAverage
      });

      await newMovie.save();
      res.status(201).json({ message: 'Movie uploaded successfully', movie: newMovie });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload movie', details: error.message });
    }
  }
);

// GET movies with filters, sorting & pagination
router.get(
  '/',
  [
    query('type').optional().isString(),
    query('category').optional().isString(),
    query('region').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { type, category, region, page = 1, limit = 20 } = req.query;
      let filter = {};

      if (type) filter.type = type.toLowerCase();

      if (category && category !== 'All') {
        if (category !== 'Trending' && category !== 'Recent') {
          filter.category = category;
        }
      }

      if (region && region !== 'All') {
        filter.region = region;
      }

      let query = Movie.find(filter);

      // Sorting
      if (category === 'Trending') {
        query = query.sort({ views: -1 });
      } else if (category === 'Recent') {
        query = query.sort({ createdAt: -1 });
      }

      // Pagination
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(parseInt(limit));

      const movies = await query.exec();
      const total = await Movie.countDocuments(filter);

      res.json({
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        movies
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

// PUT update movie by id
router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('title').optional().isString().notEmpty(),
    body('overview').optional().isString().notEmpty(),
    body('posterPath').optional().isURL(),
    body('releaseDate').optional().isISO8601(),
    body('voteAverage').optional().isNumeric(),
    body('category').optional().isString().notEmpty(),
    body('region').optional().isIn(['Hollywood', 'Bollywood']),
    body('type').optional().isString(),
    body('videoLinks').optional().isArray(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (updateData.type) updateData.type = updateData.type.toLowerCase();

      const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (!updatedMovie) {
        return res.status(404).json({ message: 'Movie not found' });
      }
      res.json(updatedMovie);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  }
);

// DELETE movie by id
router.delete('/:id', [param('id').isMongoId()], validateRequest, async (req, res) => {
  try {
    const deleted = await Movie.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Increment views count
router.put('/:id/increment-views', [param('id').isMongoId()], validateRequest, async (req, res) => {
  try {
    const updatedMovie = await Movie.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!updatedMovie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json({ message: 'Views incremented', movie: updatedMovie });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET movies by category with optional region filter
router.get('/category/:category', [param('category').isString()], validateRequest, async (req, res) => {
  const category = req.params.category;
  const region = req.query.region;

  try {
    let query = { category };

    if (region && region !== 'All') {
      query.region = { $regex: new RegExp(`^${region}$`, 'i') };
    }

    const movies = await Movie.find(query);
    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a video source to existing movie videoLinks array
router.put('/:id/add-source',
  [
    param('id').isMongoId(),
    body('videoSource').exists(),
    body('videoSource.quality').isString().notEmpty(),
    body('videoSource.language').isString().notEmpty(),
    body('videoSource.url').isURL()
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    const { videoSource } = req.body;

    try {
      const updatedMovie = await Movie.findByIdAndUpdate(
        id,
        { $push: { videoLinks: videoSource } },
        { new: true }
      );

      if (!updatedMovie) {
        return res.status(404).json({ message: 'Movie not found' });
      }

      res.json({ message: 'Video source added', movie: updatedMovie });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

module.exports = router;
