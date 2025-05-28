const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
  title: { type: String, required: true },
  overview: { type: String, required: true },
  posterPath: { type: String, required: true },
  releaseDate: { type: String, required: true },
  voteAverage: { type: Number, required: true },
  videoSources: [
    {
      quality: { type: String, required: true },  // e.g., "720p"
      language: { type: String, required: true }, // e.g., "Hindi"
      url: { type: String, required: true }
    }
  ],
  category: { type: String, required: true }, // Action, Comedy, etc.
  region: {
    type: String,
    enum: ['Hollywood', 'Bollywood', 'All'],
    required: true
  },
  type: { type: String, default: 'series' }   // always "series"
}, { timestamps: true });

module.exports = mongoose.model('Series', seriesSchema);
