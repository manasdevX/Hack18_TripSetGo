// server/src/routes/user.routes.js
const router = require('express').Router()
const userCtrl = require('../controllers/user.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')

router.get('/me',          authenticate, userCtrl.getMe)
router.put('/me',          authenticate, userCtrl.updateMe)
router.get('/:id',         optionalAuth, userCtrl.getUser)
router.get('/:id/trips',   optionalAuth, userCtrl.getUserTrips)
router.post('/:id/follow', authenticate, userCtrl.followUser)

module.exports = router
