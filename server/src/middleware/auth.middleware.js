// server/src/middleware/auth.middleware.js
const { verifyAccessToken } = require('../utils/jwt')
const { unauthorized }      = require('../utils/response')
const User                  = require('../models/User.model')

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return unauthorized(res)

    const token = authHeader.split(' ')[1]
    const decoded = verifyAccessToken(token)

    const user = await User.findById(decoded.userId).select('-passwordHash')
    if (!user) return unauthorized(res, 'User not found')
    if (user.status !== 'active') return unauthorized(res, 'Account is suspended or deleted')

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token expired')
    return unauthorized(res, 'Invalid token')
  }
}

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token   = authHeader.split(' ')[1]
      const decoded = verifyAccessToken(token)
      req.user = await User.findById(decoded.userId).select('-passwordHash')
    }
    next()
  } catch {
    next()
  }
}

module.exports = { authenticate, optionalAuth }
