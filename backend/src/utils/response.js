const success = (res, data = {}, message = 'Success') => {
  return res.status(200).json({ success: true, message, data });
};

const created = (res, data = {}, message = 'Created successfully') => {
  return res.status(201).json({ success: true, message, data });
};

const error = (res, message = 'Internal server error', statusCode = 500, details = null) => {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
};

const notFound = (res, message = 'Not found') =>
  error(res, message, 404);

const unauthorized = (res, message = 'Unauthorized') =>
  error(res, message, 401);

const forbidden = (res, message = 'Forbidden') =>
  error(res, message, 403);

const badRequest = (res, message = 'Invalid data', details = null) =>
  error(res, message, 400, details);

module.exports = { success, created, error, notFound, unauthorized, forbidden, badRequest };