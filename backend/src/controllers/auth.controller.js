// server/src/controllers/auth.controller.js
const bcrypt         = require('bcryptjs')
const crypto         = require('crypto')
const jwt            = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const User           = require('../models/User.model')
const RefreshToken   = require('../models/RefreshToken.model')
const Subscription   = require('../models/Subscription.model')
const OTP            = require('../models/OTP.model')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt')
const { success, badRequest, unauthorized, created, forbidden } = require('../utils/response')
const asyncHandler   = require('../utils/asyncHandler')
const emailService   = require('../services/email.service')
const totp           = require('../utils/totp')
const logger         = require('../utils/logger')
const auditLogger    = require('../utils/auditLogger')

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
  await auditLogger.logEvent({ userId: user._id, action: 'SIGNUP', status: 'success', req })
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
  if (!user || !user.passwordHash) {
    await auditLogger.logEvent({ action: 'LOGIN_ATTEMPT', status: 'failure', req, details: { email, reason: 'user_not_found_or_no_password' } })
    return unauthorized(res, 'Invalid credentials')
  }

  // Check brute force lockout
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minLeft = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60)
    await auditLogger.logEvent({ userId: user._id, action: 'LOGIN_LOCKOUT', status: 'failure', req, details: { reason: 'account_locked' } })
    return unauthorized(res, `Account is temporarily locked due to too many failed attempts. Try again in ${minLeft} minutes.`)
  }

  if (!user.isEmailVerified) {
    await auditLogger.logEvent({ userId: user._id, action: 'LOGIN_ATTEMPT', status: 'failure', req, details: { reason: 'email_not_verified' } })
    return unauthorized(res, 'Please verify your email first')
  }

  const valid = await user.comparePassword(password)
  if (!valid) {
    // Increment failed login attempts
    user.loginAttempts += 1
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 30 * 60 * 1000 // Lock for 30 minutes
      user.loginAttempts = 0
    }
    await user.save()

    await auditLogger.logEvent({ userId: user._id, action: 'LOGIN_ATTEMPT', status: 'failure', req, details: { reason: 'invalid_password', attempts: user.loginAttempts } })
    return unauthorized(res, 'Invalid credentials')
  }

  // Reset lock metrics on successful authentication
  if (user.loginAttempts > 0 || user.lockUntil) {
    user.loginAttempts = 0
    user.lockUntil = null
    await user.save()
  }

  // Intercept for MFA challenge
  if (user.isMfaEnabled) {
    const mfaToken = jwt.sign(
      { userId: user._id, mfaTemp: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    )
    await auditLogger.logEvent({ userId: user._id, action: 'LOGIN_MFA_CHALLENGE', status: 'success', req })
    return success(res, { mfaRequired: true, mfaToken }, 'MFA verification required')
  }

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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  await auditLogger.logEvent({ userId: user._id, action: 'LOGIN_SUCCESS', status: 'success', req })
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

  const user = await User.findById(decoded.userId)
  if (!user || user.status !== 'active') {
    res.clearCookie('refreshToken')
    return unauthorized(res, 'Account no longer active')
  }
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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
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

  // Blacklist the current access token
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
      const now = Math.floor(Date.now() / 1000)
      const remain = decoded.exp - now
      if (remain > 0) {
        const { blacklistToken } = require('../config/redis')
        await blacklistToken(decoded.jti, remain)
      }
    } catch (err) {
      // Ignore token verification errors (already expired or invalid)
    }
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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  success(res, { accessToken, user })
})

// ── Multi-Factor Authentication (MFA) ──────────────────────────────────────

exports.setupMFA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) return unauthorized(res, 'User not found')
  if (user.isMfaEnabled) return badRequest(res, 'MFA is already enabled')

  const secret = totp.generateSecret()
  user.mfaSecret = secret.hex
  await user.save()

  // Generate URL for Authenticator QR Code
  const otpauthUrl = `otpauth://totp/TripSetGo:${user.email}?secret=${secret.base32}&issuer=TripSetGo`

  success(res, {
    secret: secret.base32,
    otpauthUrl
  }, 'MFA secret generated successfully')
})

exports.enableMFA = asyncHandler(async (req, res) => {
  const { code } = req.body
  if (!code) return badRequest(res, 'Verification code is required')

  const user = await User.findById(req.user._id)
  if (!user) return unauthorized(res, 'User not found')
  if (user.isMfaEnabled) return badRequest(res, 'MFA is already enabled')
  if (!user.mfaSecret) return badRequest(res, 'MFA setup not initialized')

  const isValid = totp.verifyTOTP(code, user.mfaSecret)
  if (!isValid) return badRequest(res, 'Invalid verification code')

  // Generate backup codes
  const backupCodes = []
  for (let i = 0; i < 5; i++) {
    backupCodes.push(crypto.randomBytes(4).toString('hex')) // 8 hex digits
  }

  user.isMfaEnabled = true
  user.mfaBackupCodes = backupCodes
  await user.save()

  success(res, { backupCodes }, 'MFA enabled successfully')
})

exports.disableMFA = asyncHandler(async (req, res) => {
  const { code } = req.body
  if (!code) return badRequest(res, 'Verification code is required')

  const user = await User.findById(req.user._id)
  if (!user) return unauthorized(res, 'User not found')
  if (!user.isMfaEnabled) return badRequest(res, 'MFA is not enabled')

  const isValid = totp.verifyTOTP(code, user.mfaSecret)
  if (!isValid) return badRequest(res, 'Invalid verification code')

  user.isMfaEnabled = false
  user.mfaSecret = null
  user.mfaBackupCodes = []
  await user.save()

  success(res, null, 'MFA disabled successfully')
})

exports.verifyMfaLogin = asyncHandler(async (req, res) => {
  const { mfaToken, code } = req.body
  if (!mfaToken || !code) return badRequest(res, 'mfaToken and verification code are required')

  let payload
  try {
    payload = jwt.verify(mfaToken, process.env.JWT_SECRET)
  } catch (err) {
    return unauthorized(res, 'Invalid or expired MFA token')
  }

  if (!payload.mfaTemp) {
    return unauthorized(res, 'Invalid token context')
  }

  const user = await User.findById(payload.userId)
  if (!user || !user.isMfaEnabled) {
    return unauthorized(res, 'MFA is not active for this account')
  }

  // Check TOTP code or backup code
  let isValid = totp.verifyTOTP(code, user.mfaSecret)
  let usedBackup = false

  if (!isValid) {
    // Check backup codes
    const backupIdx = user.mfaBackupCodes.indexOf(code)
    if (backupIdx !== -1) {
      isValid = true
      usedBackup = true
      user.mfaBackupCodes.splice(backupIdx, 1) // burn code
      await user.save()
    }
  }

  if (!isValid) {
    return unauthorized(res, 'Invalid verification code')
  }

  // Log in successfully
  const jwtPayload   = { userId: user._id, email: user.email, role: user.role }
  const accessToken  = signAccessToken(jwtPayload)
  const refreshToken = signRefreshToken(jwtPayload)
  const decoded      = verifyRefreshToken(refreshToken)

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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  success(res, { 
    accessToken, 
    user,
    backupCodesLeft: user.mfaBackupCodes.length,
    usedBackupCode: usedBackup
  }, 'MFA verification successful')
})
