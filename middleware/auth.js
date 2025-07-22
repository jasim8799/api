require('dotenv').config();

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'API key missing or malformed' });
  }

  const clientKey = authHeader.split(' ')[1];

  if (clientKey !== process.env.SECRET_API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }

  next();
};
