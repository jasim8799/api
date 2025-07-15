const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/movies', require('./routes/movies'));
app.use('/api/series', require('./routes/series'));
app.use('/api/episodes', require('./routes/episodes'));
app.use('/api/app', require('./routes/appVersion.routes'));
app.use('/api/analytics', require('./routes/analytics')); // ✅ NEW ROUTE

const PORT = process.env.PORT || 3000;

// Root route for uptime check
app.get('/', (req, res) => {
  res.send('API is live');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
