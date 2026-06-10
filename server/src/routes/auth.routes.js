// server/src/routes/auth.routes.js
const router = require('express').Router()
const authCtrl = require('../controllers/auth.controller')

router.post('/signup',          authCtrl.signup)
router.post('/verify-otp',      authCtrl.verifyOTP)
router.post('/login',           authCtrl.login)
router.post('/refresh',         authCtrl.refresh)
router.post('/logout',          authCtrl.logout)
router.post('/forgot-password', authCtrl.forgotPassword)
router.post('/reset-password',  authCtrl.resetPassword)
router.post('/google/token',    authCtrl.googleToken)

module.exports = router
