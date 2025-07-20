const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'salt', 32); // 32-byte key
const iv = Buffer.from('8bytesiv12345678'); // must be 16 bytes for AES-CBC

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

module.exports = { encrypt };
