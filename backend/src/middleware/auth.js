const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return unauthorized(res, 'Token missing');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin')
    return forbidden(res, 'Admin access only');
  next();
};

module.exports = { verifyToken, verifyAdmin };