// server/src/utils/asyncHandler.js
// Wraps async route handlers to pass errors to Express error middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
