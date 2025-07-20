// middleware/auth.js
require('dotenv').config();

module.exports = function (req, res, next) {
  const clientKey = req.headers['x-api-key'];

  if (!clientKey || clientKey !== process.env.SECRET_API_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid or missing API key' });
  }

  next();
};
