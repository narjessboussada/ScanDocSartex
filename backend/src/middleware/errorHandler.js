const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} :`, err.message);

  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ success: false, message: 'Session expired, please log in again' });

  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ success: false, message: 'Invalid token' });

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({ success: false, message: err.message });
};

module.exports = errorHandler;