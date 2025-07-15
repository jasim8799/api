const express = require('express');
const router = express.Router();
const AppStats = require('../models/AppStats');

// GET stats for admin panel
router.get('/', async (req, res) => {
  let stats = await AppStats.findOne();
  if (!stats) {
    stats = new AppStats();
    await stats.save();
  }
  res.json(stats);
});

// POST /visit - when user opens app
router.post('/visit', async (req, res) => {
  let stats = await AppStats.findOne();
  if (!stats) stats = new AppStats();

  const today = new Date();
  if (!stats.lastUpdated || stats.lastUpdated.toDateString() !== today.toDateString()) {
    stats.todayVisits = 0;
  }

  stats.totalVisits += 1;
  stats.todayVisits += 1;
  stats.lastUpdated = today;
  await stats.save();

  res.json({ message: "Visit recorded." });
});

// POST /install - when user installs app
router.post('/install', async (req, res) => {
  let stats = await AppStats.findOne();
  if (!stats) stats = new AppStats();

  stats.totalInstalls += 1;
  stats.lastUpdated = new Date();
  await stats.save();

  res.json({ message: "Install recorded." });
});

// optional: POST /play - track movie plays
router.post('/play', async (req, res) => {
  let stats = await AppStats.findOne();
  if (!stats) stats = new AppStats();

  stats.totalMoviePlays += 1;
  stats.lastUpdated = new Date();
  await stats.save();

  res.json({ message: "Movie play recorded." });
});

module.exports = router;
