// server/src/routes/auth.routes.js
const express = require('express')
const rateLimit = require('express-rate-limit')
const authCtrl = require('../controllers/auth.controller')

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

router.post('/signup',          authLimiter, authCtrl.signup)
router.post('/verify-otp',      otpLimiter, authCtrl.verifyOTP)
router.post('/login',           authLimiter, authCtrl.login)
router.post('/refresh',         authCtrl.refresh)
router.post('/logout',          authCtrl.logout)
router.post('/forgot-password', otpLimiter, authCtrl.forgotPassword)
router.post('/reset-password',  authCtrl.resetPassword)
router.post('/google/token',    authCtrl.googleToken)

module.exports = router
