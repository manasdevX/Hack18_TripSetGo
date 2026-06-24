// server/src/routes/user.routes.js
const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const userCtrl = require('../controllers/user.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate.middleware')
const multer = require('multer')
const { updateProfileSchema } = require('../validators/user.validator')

// Configure multer memory storage for buffer uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false)
    }
  }
})

// Rate limiting for social features to prevent abuse
const socialLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: { success: false, message: 'Too many requests. Please try again later.' }
})

router.get('/me',          authenticate, userCtrl.getMe)
router.put('/me',          authenticate, validate(updateProfileSchema), userCtrl.updateMe)
router.post('/me/avatar',  authenticate, upload.single('avatar'), userCtrl.uploadAvatar)
router.get('/:id',         optionalAuth, userCtrl.getUser)
router.get('/:id/trips',   optionalAuth, userCtrl.getUserTrips)
router.post('/:id/follow', authenticate, socialLimiter, userCtrl.followUser)

module.exports = router
