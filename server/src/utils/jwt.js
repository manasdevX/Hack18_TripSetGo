// server/src/utils/jwt.js
const jwt  = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' })

const signRefreshToken = (payload) =>
  jwt.sign(
    { ...payload, jti: uuidv4() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  )

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET)

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken }
