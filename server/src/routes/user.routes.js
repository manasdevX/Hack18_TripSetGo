// server/src/routes/user.routes.js
const router = require('express').Router()
const userCtrl = require('../controllers/user.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const multer = require('multer')

// Configure multer memory storage for buffer uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

router.get('/me',          authenticate, userCtrl.getMe)
router.put('/me',          authenticate, userCtrl.updateMe)
router.post('/me/avatar',  authenticate, upload.single('avatar'), userCtrl.uploadAvatar)
router.get('/:id',         optionalAuth, userCtrl.getUser)
router.get('/:id/trips',   optionalAuth, userCtrl.getUserTrips)
router.post('/:id/follow', authenticate, userCtrl.followUser)

module.exports = router
