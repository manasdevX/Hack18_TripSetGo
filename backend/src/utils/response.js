// server/src/utils/response.js — Standard API response helpers
const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data })

const error = (res, message = 'Internal Server Error', statusCode = 500, errors = null) =>
  res.status(statusCode).json({ success: false, message, ...(errors ? { errors } : {}) })

const created = (res, data, message = 'Created successfully') =>
  success(res, data, message, 201)

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 404)

const unauthorized = (res, message = 'Unauthorized') =>
  error(res, message, 401)

const forbidden = (res, message = 'Forbidden') =>
  error(res, message, 403)

const badRequest = (res, message = 'Bad Request', errors = null) =>
  error(res, message, 400, errors)

module.exports = { success, error, created, notFound, unauthorized, forbidden, badRequest }
