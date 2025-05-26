const express = require('express');
const router = express.Router();
const Series = require('../models/Series');

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

// GET all series or by category and region
router.get('/', async (req, res) => {
  const { category, region } = req.query;
  try {
    const filter = {};
    if (category && category !== 'All') filter.category = category;
if (region && region !== 'All') {
  filter.region = { $regex: new RegExp(`^${region}$`, 'i') };
}
    const series = await Series.find(filter);
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

module.exports = router;
