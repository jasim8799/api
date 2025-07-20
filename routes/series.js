const express = require('express');
const { query, validationResult, param } = require('express-validator');
const router = express.Router();
const Series = require('../models/Series');
const verifyApiKey = require('../middleware/auth'); // ✅ import

router.use(verifyApiKey); // ✅ apply middleware to all movie routes

// Helper middleware to check validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST a series
router.post('/', async (req, res) => {
  try {
    const { title, overview, releaseDate, voteAverage, videoSources, category, type, posterPath, region } = req.body;

    if (!posterPath) {
      return res.status(400).json({ error: 'posterPath is required.' });
    }

    const newSeries = new Series({
      title,
      overview,
      releaseDate,
      voteAverage: parseFloat(voteAverage),
      videoSources,
      category,
      type,
      posterPath,
      region
    });

    await newSeries.save();
    res.status(201).json({ message: 'Series uploaded successfully', series: newSeries });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET all series or by filters
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
          filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }
      }

      if (region && region !== 'All') {
        filter.region = { $regex: new RegExp(`^${region}$`, 'i') };
      }

      let query = Series.find(filter);

      if (category === 'Trending') {
        query = query.sort({ views: -1 });
      } else if (category === 'Recent') {
        query = query.sort({ createdAt: -1 });
      } else {
        query = query.sort({ createdAt: -1 });
      }

      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(parseInt(limit));

      const series = await query.exec();
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

// PUT update series
router.put('/:id', async (req, res) => {
  try {
    const updated = await Series.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a series
router.delete('/:id', async (req, res) => {
  try {
    await Series.findByIdAndDelete(req.params.id);
    res.json({ message: 'Series deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET series by category
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const region = req.query.region;
    const query = { category };

    if (region && region !== 'All') {
      query.region = { $regex: new RegExp(`^${region}$`, 'i') };
    }

    const series = await Series.find(query);
    res.status(200).json(series);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch series by category' });
  }
});

router.get('/titles', async (req, res) => {
  try {
    const series = await Series.find({}, '_id title').exec();
    res.json(series);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch series titles' });
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
