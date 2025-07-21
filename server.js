const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();
const path = require('path');
const { URL } = require('url');

const app = express();

app.set('trust proxy', 1); // 👈 Required when behind a proxy (like Render)

// --- Middleware --- //
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Static file hosting
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Token Auth Middleware --- //
const verifyToken = (req, res, next) => {
  const token = req.headers['x-api-key'];
  if (!token || token !== process.env.SECRET_API_KEY) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }
  next();
};

// --- MongoDB Connection --- //
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- Protected Routes --- //
try {
  app.use('/api/movies', verifyToken, require('./routes/movies'));
  app.use('/api/series', verifyToken, require('./routes/series'));
  app.use('/api/episodes', verifyToken, require('./routes/episodes'));
  app.use('/api/app', verifyToken, require('./routes/appVersion.routes'));
  app.use('/api/analytics', verifyToken, require('./routes/analytics'));
  app.use('/api/appstats', verifyToken, require('./routes/appStats.routes'));
  app.use('/api/crashes', verifyToken, require('./routes/crash.routes'));
} catch (err) {
  console.error('❌ Error mounting routes:', err);
}

// --- Proxy Cloudflare Video --- //
app.use('/proxy/video', verifyToken, createProxyMiddleware({
  target: 'https://your-cloudflare-link.com',
  changeOrigin: true,
  pathRewrite: {
    '^/proxy/video': '',
  }
}));

// --- General Proxy Route --- //
app.get('/proxy', async (req, res, next) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const parsedUrl = new URL(targetUrl);
    createProxyMiddleware({
      target: `${parsedUrl.protocol}//${parsedUrl.host}`,
      changeOrigin: true,
      pathRewrite: (path, req) => parsedUrl.pathname + (parsedUrl.search || ''),
    })(req, res, next);
  } catch (err) {
    console.error('❌ Proxy Error:', err);
    return res.status(400).json({ error: 'Invalid URL' });
  }
});

// --- Uptime Test --- //
app.get('/', (req, res) => {
  res.send('✅ API is live');
});

// --- GLOBAL ERROR HANDLER --- //
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack || err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
