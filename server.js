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

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Limit each IP to 100 requests per 10 mins
});
app.use(limiter);

// --- Serve uploads ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- Token Auth Middleware ---
const TOKEN = process.env.SECRET_TOKEN || 'mysecrettoken123';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// --- Proxy: Render API ---
app.use('/proxy/api', authMiddleware, createProxyMiddleware({
  target: 'https://your-render-api.onrender.com', // ✅ Change this to your actual Render API
  changeOrigin: true,
  pathRewrite: { '^/proxy/api': '' },
}));

// --- Proxy: CDN Videos (Cloudflare, Bunny, etc.) ---
app.use('/proxy/video', authMiddleware, createProxyMiddleware({
  target: 'https://your.video.cdn.com', // ✅ Replace with real video CDN
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
app.use('/api/proxy-events', require('./routes/proxyEventLogger')); // ✅ renamed properly

// --- Health Check ---
app.get('/', (req, res) => {
  res.send('🚀 API is live');
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
