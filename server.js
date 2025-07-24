const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();
const path = require('path');

const app = express();

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());

// --- Rate Limiting (basic) ---
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP
});
app.use(limiter);

// --- Serve uploads folder ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MongoDB connection ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// --- Token Auth Middleware ---
const TOKEN = process.env.SECRET_TOKEN || 'mysecrettoken123'; // use env in production

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// --- Proxy API from Render ---
app.use('/proxy/api', authMiddleware, createProxyMiddleware({
  target: 'https://your-render-api.onrender.com',
  changeOrigin: true,
  pathRewrite: { '^/proxy/api': '' },
}));

// --- Proxy Videos (e.g., Cloudflare, Bunny, etc.) ---
app.use('/proxy/video', authMiddleware, createProxyMiddleware({
  target: 'https://your.video.cdn.com',
  changeOrigin: true,
  pathRewrite: { '^/proxy/video': '' },
}));

// --- Your API Routes ---
app.use('/api/movies', require('./routes/movies'));
app.use('/api/series', require('./routes/series'));
app.use('/api/episodes', require('./routes/episodes'));
app.use('/api/app', require('./routes/appVersion.routes'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/appstats', require('./routes/appStats.routes'));
app.use('/api/crashes', require('./routes/crash.routes'));
app.use('/api/proxy-analytics', require('./routes/proxyAnalytics'));

// --- Health Check Route ---
app.get('/', (req, res) => {
  res.send('API is live');
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
