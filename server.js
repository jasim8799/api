const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();
const path = require('path');

const app = express();

// --- Middleware --- //
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Token Auth Middleware --- //
const verifyToken = (req, res, next) => {
  const token = req.headers['x-api-key'];
  if (!token || token !== process.env.SECRET_API_KEY) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }
  next();
};

// --- MongoDB --- //
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// --- Protected Routes --- //
app.use('/api/movies', verifyToken, require('./routes/movies'));
app.use('/api/series', verifyToken, require('./routes/series'));
app.use('/api/episodes', verifyToken, require('./routes/episodes'));
app.use('/api/app', verifyToken, require('./routes/appVersion.routes'));
app.use('/api/analytics', verifyToken, require('./routes/analytics'));
app.use('/api/appstats', verifyToken, require('./routes/appStats.routes'));
app.use('/api/crashes', verifyToken, require('./routes/crash.routes'));

// --- Proxy Cloudflare Video (Hides real Cloudflare URLs) --- //
app.use('/proxy/video', verifyToken, createProxyMiddleware({
  target: 'https://your-cloudflare-link.com', // only domain part, not full link
  changeOrigin: true,
  pathRewrite: {
    '^/proxy/video': '', // strip /proxy/video from URL
  },
  onProxyReq(proxyReq, req, res) {
    // Optional: log or inspect
  }
}));

// --- Uptime Test --- //
app.get('/', (req, res) => {
  res.send('API is live');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
