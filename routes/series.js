const express = require('express');
const router = express.Router();
const { body, validationResult, query, param } = require('express-validator');
const Series = require('../models/Series');
const Episode = require('../models/Episode'); // ✅ added
const verifyApiKey = require('../middleware/auth'); 
const axios = require("axios"); 

router.use(verifyApiKey);

// ✅ Validation helper
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ✅ Storage health check with short cache
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

// ✅ POST create a new series
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
        releaseDate,
        voteAverage,
        storageProvider
      } = req.body;

      const newSeries = new Series({
        title,
        overview,
        category,
        region,
        type: type ? type.toLowerCase() : 'series',
        posterPath,
        releaseDate,
        voteAverage,
        storageProvider: storageProvider || 'cloudflare'
      });

      await newSeries.save();
      res.status(201).json({ message: 'Series uploaded successfully', series: newSeries });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload series', details: error.message });
    }
  }
);

// ✅ GET series with episodes + failover
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
      const pageNum = parseInt(page);
      const perPage = parseInt(limit);
      const skip = (pageNum - 1) * perPage;

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

      // ✅ check provider status
      const status = await checkStorageStatus();

      // ✅ fetch series
      let queryBuilder = Series.find(filter);
      if (category === 'Trending') {
        queryBuilder = queryBuilder.sort({ views: -1 });
      } else if (category === 'Recent') {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
      } else {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
      }
      queryBuilder = queryBuilder.skip(skip).limit(perPage);

      let seriesList = await queryBuilder.exec();
      const total = await Series.countDocuments(filter);

      // ✅ attach episodes with storage failover
      const enrichedSeries = await Promise.all(
        seriesList.map(async s => {
          const episodes = await Episode.find({ seriesId: s._id }).sort({ episodeNumber: 1 });

          const updatedEpisodes = episodes.map(ep => {
            const filteredSources = (ep.videoSources || []).filter(link => {
              if (link.url.includes("b-cdn.net") || link.url.includes("cloudflare")) {
                return status.cloudflare;
              }
              if (link.url.includes("wasabisys.com") || link.url.includes("wasabi")) {
                return status.wasabi;
              }
              return true;
            });
            return { ...ep.toObject(), videoSources: filteredSources };
          }).filter(ep => ep.videoSources.length > 0);

          return { ...s.toObject(), episodes: updatedEpisodes };
        })
      );

      res.json({
        page: pageNum,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        series: enrichedSeries
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

// ✅ PUT update series
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
    body('storageProvider').optional().isIn(['cloudflare', 'wasabi'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (updateData.type) updateData.type = updateData.type.toLowerCase();

      const updatedSeries = await Series.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (!updatedSeries) {
        return res.status(404).json({ message: 'Series not found' });
      }
      res.json(updatedSeries);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ✅ DELETE series
router.delete('/:id', [param('id').isMongoId()], validateRequest, async (req, res) => {
  try {
    const deleted = await Series.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Series not found' });
    }
    res.json({ message: 'Series deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Increment views
router.put('/:id/increment-views', [param('id').isMongoId()], validateRequest, async (req, res) => {
  try {
    const updatedSeries = await Series.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!updatedSeries) {
      return res.status(404).json({ message: 'Series not found' });
    }
    res.json({ message: 'Views incremented', series: updatedSeries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ GET titles
router.get('/titles', async (req, res) => {
  try {
    const series = await Series.find({}, '_id title').exec();
    res.json(series);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch series titles' });
  }
});

// ✅ GET all
router.get('/all', async (req, res) => {
  try {
    const series = await Series.find({}, '_id title');
    res.json(series);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching series titles' });
  }
});

// ✅ Search by title
router.get('/search', [
  query('title').isString().notEmpty()
], validateRequest, async (req, res) => {
  try {
    const { title } = req.query;

    const series = await Series.find({
      title: { $regex: title, $options: 'i' }
    });

    res.json(series);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search series' });
  }
});

module.exports = router;
