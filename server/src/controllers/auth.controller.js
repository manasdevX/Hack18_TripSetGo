// server/src/controllers/auth.controller.js
const bcrypt         = require('bcryptjs')
const crypto         = require('crypto')
const { v4: uuidv4 } = require('uuid')
const User           = require('../models/User.model')
const RefreshToken   = require('../models/RefreshToken.model')
const Subscription   = require('../models/Subscription.model')
const OTP            = require('../models/OTP.model')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt')
const { success, badRequest, unauthorized, created } = require('../utils/response')
const asyncHandler   = require('../utils/asyncHandler')
const emailService   = require('../services/email.service')
const logger         = require('../utils/logger')

// Helper functions for MongoDB OTP storage
const setOTP = async (email, otp) => {
  // Overwrite existing OTP for this email to prevent spamming
  await OTP.findOneAndDelete({ email })
  await OTP.create({ email, otp })
}

const verifyOTPFromStore = async (email, otp) => {
  const entry = await OTP.findOne({ email })
  if (!entry) return false
  if (entry.otp !== otp) return false
  // Delete after successful verification
  await OTP.deleteOne({ _id: entry._id })
  return true
}

// ── Signup ────────────────────────────────────────────────────────────────

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return badRequest(res, 'Name, email and password are required')
  if (password.length < 8) return badRequest(res, 'Password must be at least 8 characters')

  const existing = await User.findOne({ email })
  if (existing) return badRequest(res, 'Email already registered')

  const user = new User({ name, email, passwordHash: password })
  await user.save()

  // Create subscription record
  await Subscription.create({ userId: user._id })

  // Generate & send OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  await setOTP(email, otp)
  await emailService.sendOTP(email, name, otp)

  logger.info(`New signup: ${email}`)
  created(res, { email }, 'Account created. OTP sent to your email.')
})

// ── Verify OTP ────────────────────────────────────────────────────────────

exports.verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body
  if (!email || !otp) return badRequest(res, 'Email and OTP are required')

  const isValid = await verifyOTPFromStore(email, otp)
  if (!isValid) return badRequest(res, 'Invalid or expired OTP')

  await User.updateOne({ email }, { isEmailVerified: true })
  success(res, null, 'Email verified successfully')
})

// ── Login ─────────────────────────────────────────────────────────────────

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return badRequest(res, 'Email and password are required')

  const user = await User.findOne({ email })
  if (!user || !user.passwordHash) return unauthorized(res, 'Invalid credentials')
  if (!user.isEmailVerified) return unauthorized(res, 'Please verify your email first')

  const valid = await user.comparePassword(password)
  if (!valid) return unauthorized(res, 'Invalid credentials')

  const payload      = { userId: user._id, email: user.email, role: user.role }
  const accessToken  = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  const decoded = verifyRefreshToken(refreshToken)
  await RefreshToken.create({
    userId:    user._id,
    token:     refreshToken,
    jti:       decoded.jti,
    expiresAt: new Date(decoded.exp * 1000),
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip || '',
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  success(res, { accessToken, user }, 'Login successful')
})

// ── Refresh Token ─────────────────────────────────────────────────────────

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken
  if (!token) return unauthorized(res, 'No refresh token')

  const decoded = verifyRefreshToken(token)
  const stored  = await RefreshToken.findOne({ token, isRevoked: false })
  if (!stored || stored.expiresAt < new Date()) return unauthorized(res, 'Refresh token expired or revoked')

  // Rotate token (revoke old, issue new)
  stored.isRevoked = true
  await stored.save()

  const user      = await User.findById(decoded.userId)
  const payload   = { userId: user._id, email: user.email, role: user.role }
  const newAccess  = signAccessToken(payload)
  const newRefresh = signRefreshToken(payload)
  const newDecoded = verifyRefreshToken(newRefresh)

  await RefreshToken.create({
    userId:    user._id,
    token:     newRefresh,
    jti:       newDecoded.jti,
    expiresAt: new Date(newDecoded.exp * 1000),
  })

  res.cookie('refreshToken', newRefresh, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  success(res, { accessToken: newAccess }, 'Token refreshed')
})

// ── Logout ────────────────────────────────────────────────────────────────

exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken
  if (token) {
    await RefreshToken.updateOne({ token }, { isRevoked: true })
    res.clearCookie('refreshToken')
  }
  success(res, null, 'Logged out')
})

// ── Forgot Password ───────────────────────────────────────────────────────

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) return badRequest(res, 'Email is required')

  const user = await User.findOne({ email })
  if (!user) return success(res, null, 'If that email exists, a reset OTP has been sent')

  const otp = String(Math.floor(100000 + Math.random() * 900000))
  await setOTP(`reset-${email}`, otp)
  await emailService.sendPasswordResetOTP(email, user.name, otp)

  success(res, null, 'Password reset OTP sent to your email')
})

// ── Reset Password ────────────────────────────────────────────────────────

exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body
  if (!email || !otp || !newPassword) return badRequest(res, 'Email, OTP and new password are required')
  if (newPassword.length < 8) return badRequest(res, 'Password must be at least 8 characters')

  const isValid = await verifyOTPFromStore(`reset-${email}`, otp)
  if (!isValid) return badRequest(res, 'Invalid or expired OTP')

  const user = await User.findOne({ email })
  if (!user) return badRequest(res, 'User not found')

  user.passwordHash = newPassword // will be hashed by pre-save hook
  await user.save()

  // Revoke all refresh tokens
  await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true })

  success(res, null, 'Password reset successful. Please log in.')
})

// ── Google OAuth Token (from frontend credential) ─────────────────────────

exports.googleToken = asyncHandler(async (req, res) => {
  const { token } = req.body
  if (!token) return badRequest(res, 'Google token required')

  const { OAuth2Client } = require('google-auth-library')
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID })
  const payload = ticket.getPayload()

  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email }] })

  if (!user) {
    user = await User.create({
      name: payload.name, email: payload.email,
      googleId: payload.sub, avatar: payload.picture,
      isEmailVerified: true,
    })
    await Subscription.create({ userId: user._id })
  } else if (!user.googleId) {
    user.googleId = payload.sub
    user.avatar   = payload.picture || user.avatar
    await user.save()
  }

  const jwtPayload   = { userId: user._id, email: user.email, role: user.role }
  const accessToken  = signAccessToken(jwtPayload)
  const refreshToken = signRefreshToken(jwtPayload)
  const decoded      = verifyRefreshToken(refreshToken)

  await RefreshToken.create({
    userId:    user._id, token: refreshToken, jti: decoded.jti,
    expiresAt: new Date(decoded.exp * 1000),
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  success(res, { accessToken, user })
})
