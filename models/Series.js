const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
  title: { type: String, required: true },
  overview: { type: String, required: true },
  posterPath: { type: String, required: true },
  releaseDate: { type: String, required: true },
  voteAverage: { type: Number, required: true },
  videoUrl: { type: String, required: true },
  category: { type: String, required: true }, // Action, Comedy, etc.
  type: { type: String, default: 'series' }   // always "series"
});

module.exports = mongoose.model('Series', seriesSchema);
