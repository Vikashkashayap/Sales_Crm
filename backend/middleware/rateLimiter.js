const windowMs = 15 * 60 * 1000;
const maxRequests = 300;
const hits = new Map();

export const rateLimiter = (req, res, next) => {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = hits.get(key);

  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
    hits.set(key, entry);
  }

  entry.count += 1;

  if (entry.count > maxRequests) {
    return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }

  next();
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits.entries()) {
    if (now - entry.start > windowMs) hits.delete(key);
  }
}, windowMs);
