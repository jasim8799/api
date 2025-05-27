const mongoose = require('mongoose');

const videoLinkSchema = new mongoose.Schema({
  quality: { type: String, required: true },   // e.g., "720p"
  language: { type: String, required: true },  // e.g., "Hindi"
  url: { type: String, required: true }
}, { _id: false });

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  overview: { type: String, required: true },
  posterPath: { type: String, required: true },
  releaseDate: { type: Date, required: true },   // Use Date type instead of string
  voteAverage: { type: Number, required: true },
  videoLinks: [videoLinkSchema],
  category: { type: String, required: true },    // Action, Comedy, etc.
  region: {
    type: String,
    enum: ['Hollywood', 'Bollywood'],
    required: true
  },
  type: { type: String, default: 'movie', lowercase: true },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Movie', movieSchema);
