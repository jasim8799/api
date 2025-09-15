const express = require('express');
const router = express.Router();
const { body, validationResult, query, param } = require('express-validator');
const Series = require('../models/Series');
const verifyApiKey = require('../middleware/auth'); // ✅
const axios = require("axios"); // ✅ For storage health check

router.use(verifyApiKey);

// Helper middleware to check validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// 🔹 Helper to check storage provider status
async function checkStorageStatus() {
  let status = { cloudflare: false, wasabi: false };

  try {
    await axios.head("https://your-cloudflare-test-file.mp4", { timeout: 5000 });
    status.cloudflare = true;
  } catch (e) {}

  try {
    await axios.head("https://your-wasabi-test-file.mp4", { timeout: 5000 });
    status.wasabi = true;
  } catch (e) {}

  return status;
}

// POST create a new series
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
    body('storageProvider').optional().isIn(['cloudflare', 'wasabi']) // ✅
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
        storageProvider: storageProvider || 'cloudflare' // ✅ default
      });

      await newSeries.save();
      res.status(201).json({ message: 'Series uploaded successfully', series: newSeries });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload series', details: error.message });
    }
  }
);

// GET series with filters, sorting & pagination (✅ updated with failover)
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

      // ✅ Apply storage failover
      const status = await checkStorageStatus();

      if (status.cloudflare && !status.wasabi) {
        filter.storageProvider = 'cloudflare';
      } else if (!status.cloudflare && status.wasabi) {
        filter.storageProvider = 'wasabi';
      } else if (!status.cloudflare && !status.wasabi) {
        return res.status(503).json({ message: 'All storage providers are down' });
      }
      // If both alive → no filter, show all

      let queryBuilder = Series.find(filter);

      // Sorting
      if (category === 'Trending') {
        queryBuilder = queryBuilder.sort({ views: -1 });
      } else if (category === 'Recent') {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
      } else {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
      }

      // Pagination
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(parseInt(limit));

      const series = await queryBuilder.exec();
      const total = await Series.countDocuments(filter);

      res.json({
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        series
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

// PUT update series by id
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
    body('storageProvider').optional().isIn(['cloudflare', 'wasabi']) // ✅
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

// DELETE series by id
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

// Increment views count
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

// GET series titles (_id and title only) for dropdowns
router.get('/titles', async (req, res) => {
  try {
    const series = await Series.find({}, '_id title').exec();
    res.json(series);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch series titles' });
  }
});

// GET all series (id + title)
router.get('/all', async (req, res) => {
  try {
    const series = await Series.find({}, '_id title');
    res.json(series);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching series titles' });
  }
});

// ✅ NEW - Search series by title
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
