const express = require('express');
const router = express.Router();
const { body, validationResult, query, param } = require('express-validator');
const Movie = require('../models/Movie');
const verifyApiKey = require('../middleware/auth');
const axios = require("axios");

router.use(verifyApiKey);

// Helper middleware to check validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// 🔹 Storage health check with short cache
const STORAGE_CACHE_TTL = 10 * 1000; // 10 sec
let storageCache = { status: { cloudflare: false, wasabi: false }, expiresAt: 0 };

async function rawCheckStorageStatus() {
  let status = { cloudflare: false, wasabi: false };

  try {
    await axios.head(process.env.CF_TEST_URL || "https://your-cloudflare-test-file.mp4", { timeout: 5000 });
    status.cloudflare = true;
  } catch (e) {
    console.warn("Cloudflare check failed:", e.message);
  }

  try {
    await axios.head(process.env.WASABI_TEST_URL || "https://your-wasabi-test-file.mp4", { timeout: 5000 });
    status.wasabi = true;
  } catch (e) {
    console.warn("Wasabi check failed:", e.message);
  }

  return status;
}

async function checkStorageStatus() {
  if (Date.now() < storageCache.expiresAt) {
    return storageCache.status;
  }
  const status = await rawCheckStorageStatus();
  storageCache = { status, expiresAt: Date.now() + STORAGE_CACHE_TTL };
  return status;
}

// POST create a new movie
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
    body('videoLinks.*.url').isURL(),
    body('storageProvider').optional().isIn(['cloudflare', 'wasabi'])
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
        voteAverage,
        storageProvider
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
        voteAverage,
        storageProvider: storageProvider || 'cloudflare'
      });

      await newMovie.save();
      res.status(201).json({ message: 'Movie uploaded successfully', movie: newMovie });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload movie', details: error.message });
    }
  }
);

// ✅ GET movies with filters, sorting & pagination (failover inside videoLinks)
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
      const { type, category, region, page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page);
      const perPage = parseInt(limit);
      const skip = (pageNum - 1) * perPage;

      let baseFilter = {};
      if (type) baseFilter.type = type.toLowerCase();
      if (category && category !== 'All') {
        if (category !== 'Trending' && category !== 'Recent') {
          baseFilter.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }
      }
      if (region && region !== 'All') {
        baseFilter.region = { $regex: new RegExp(`^${region}$`, 'i') };
      }

      // 🔹 check provider status
      const status = await checkStorageStatus();

      // 🔹 fetch movies normally
      let queryBuilder = Movie.find(baseFilter);
      if (category === 'Trending') {
        queryBuilder = queryBuilder.sort({ views: -1 });
      } else if (category === 'Recent') {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
      } else {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
      }
      queryBuilder = queryBuilder.skip(skip).limit(perPage);

      let movies = await queryBuilder.exec();
      const total = await Movie.countDocuments(baseFilter);

      // 🔹 filter videoLinks based on provider status (don’t drop movie)
      movies = movies.map(m => {
        const filteredLinks = m.videoLinks.filter(link => {
          if (link.url.includes("b-cdn.net") || link.url.includes("cloudflare")) {
            return status.cloudflare;
          }
          if (link.url.includes("wasabisys.com") || link.url.includes("wasabi")) {
            return status.wasabi;
          }
          return true;
        });
        return { ...m.toObject(), videoLinks: filteredLinks };
      });

      // ✅ Return all movies (even if videoLinks = [])
      res.json({
        page: pageNum,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
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
    body('storageProvider').optional().isIn(['cloudflare', 'wasabi'])
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
