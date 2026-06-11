// server/src/routes/auth.routes.js
const express = require('express')
const rateLimit = require('express-rate-limit')
const authCtrl = require('../controllers/auth.controller')
const validate = require('../middleware/validate.middleware')
const {
  signupSchema, loginSchema, verifyOtpSchema,
  forgotPasswordSchema, resetPasswordSchema, googleTokenSchema,
} = require('../validators/auth.validator')

const router = express.Router()

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
})

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit to 5 requests per hour
  message: { success: false, message: 'Too many OTP requests, please try again later' }
})

router.post('/signup',          authLimiter, validate(signupSchema),        authCtrl.signup)
router.post('/verify-otp',      otpLimiter,  validate(verifyOtpSchema),     authCtrl.verifyOTP)
router.post('/login',           authLimiter, validate(loginSchema),         authCtrl.login)
router.post('/refresh',         authCtrl.refresh)
router.post('/logout',          authCtrl.logout)
router.post('/forgot-password', otpLimiter,  validate(forgotPasswordSchema), authCtrl.forgotPassword)
router.post('/reset-password',  authLimiter, validate(resetPasswordSchema),  authCtrl.resetPassword)
router.post('/google/token',    authLimiter, validate(googleTokenSchema),    authCtrl.googleToken)

module.exports = router
