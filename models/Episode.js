const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true },
  episodeNumber: { type: Number, required: true },
  title: { type: String, required: true },
  overview: { type: String },
  videoUrl: { type: String, required: true },
  releaseDate: { type: String },
});

module.exports = mongoose.model('Episode', episodeSchema);
