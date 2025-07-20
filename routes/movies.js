const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { body, validationResult, query, param } = require('express-validator');
const Movie = require('../models/Movie');
const verifyApiKey = require('../middleware/auth');

// ✅ Encryption setup
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String('my32lengthsupersecretnooneknows1')).digest('base64').substr(0, 32);
const IV = Buffer.from('8bytesiv12345678'); // Must be 16 bytes for AES
const algorithm = 'aes-256-cbc';

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// ✅ Middleware
router.use(verifyApiKey);

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
// POST create a new movie
// ✅ POST - Create a new movie with encrypted URLs
router.post(
  '/',
  [
    body('title').isString().notEmpty(),
    body('overview').isString().notEmpty(),
    body('posterPath').isURL(),
    body('releaseDate').isISO8601(),
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

      // ✅ Encrypt all video link URLs
      const encryptedVideoLinks = videoLinks.map(link => ({
        quality: link.quality,
        language: link.language,
        url: encrypt(link.url)
      }));

      const newMovie = new Movie({
        title,
        overview,
        category,
        region,
        type: type ? type.toLowerCase() : 'movie',
        posterPath,
        videoLinks: encryptedVideoLinks,
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
    query('limit').optional().isInt({ min: 1, max: 1000 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { type, category, region, page = 1, limit = 1000 } = req.query;
      let filter = {};

      if (type) filter.type = type.toLowerCase();

      if (category && category !== 'All') {
        if (category !== 'Trending' && category !== 'Recent') {
          filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }
      }

      if (region && region !== 'All') {
        filter.region = { $regex: new RegExp(`^${region}$`, 'i') };
      }

      let query = Movie.find(filter);

      // Sorting
      if (category === 'Trending') {
        query = query.sort({ views: -1 });
      } else if (category === 'Recent') {
        query = query.sort({ createdAt: -1 });
      } else {
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
// ✅ PUT /:id/add-source – Add encrypted video source to videoLinks array
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
      // ✅ Encrypt video source URL
      const encryptedSource = {
        ...videoSource,
        url: encrypt(videoSource.url)
      };

      const updatedMovie = await Movie.findByIdAndUpdate(
        id,
        { $push: { videoLinks: encryptedSource } },
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
  res.status(410).json({ message: 'This endpoint is deprecated. Please use GET /api/movies with category and region query parameters.' });
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

// GET movies titles (_id and title only) for dropdowns
router.get('/titles', async (req, res) => {
  try {
    const movies = await Movie.find({}, '_id title').exec();
    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch movie titles' });
  }
});

// GET all movies (id + title)
router.get('/all', async (req, res) => {
  try {
    const movies = await Movie.find({}, '_id title');
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching movie titles' });
  }
});

// ✅ NEW - Search movies by title
router.get('/search', [
  query('title').isString().notEmpty()
], validateRequest, async (req, res) => {
  try {
    const { title } = req.query;

    const movies = await Movie.find({
      title: { $regex: title, $options: 'i' }
    });

    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

module.exports = router;
