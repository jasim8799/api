const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  overview: { type: String, required: true },
  posterPath: { type: String, required: true },
  releaseDate: { type: String, required: true },
  voteAverage: { type: Number, required: true },
  videoUrl: { type: String, required: true },
  category: { type: String, required: true }, // Action, Comedy, etc.
  region: { type: String }, // NEW FIELD
  type: { type: String, default: 'movie' }     // always "movie"
});

module.exports = mongoose.model('Movie', movieSchema);

