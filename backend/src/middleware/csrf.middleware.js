// server/src/middleware/csrf.middleware.js
const crypto = require('crypto')

const csrfProtection = (req, res, next) => {
  // Safe methods do not require CSRF checks
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    return next()
  }

  // Exempt public authentication routes from CSRF checking
  const exemptedPaths = [
    '/api/v1/auth/signup',
    '/api/v1/auth/verify-otp',
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/google/token',
    '/api/v1/auth/mfa/verify-login'
  ]

  const fullPath = req.originalUrl.split('?')[0]
  if (exemptedPaths.some(path => fullPath.startsWith(path))) {
    return next()
  }

  // If the request contains a Bearer Authorization header, it is immune to CSRF.
  // This supports cross-domain production environments (Vercel + Render) where
  // frontend scripts cannot read cookies set on the backend domain.
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next()
  }

  const csrfCookie = req.cookies?.csrfToken
  const csrfHeader = req.headers['x-csrf-token']

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed'
    })
  }

  next()
}

const setCsrfToken = (req, res, next) => {
  // Generate token if it doesn't exist yet in cookies
  if (!req.cookies?.csrfToken) {
    const token = crypto.randomBytes(24).toString('hex')
    res.cookie('csrfToken', token, {
      httpOnly: false, // Accessible by frontend JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
  }
  next()
}

module.exports = {
  csrfProtection,
  setCsrfToken
}
