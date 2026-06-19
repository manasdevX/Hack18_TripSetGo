// server/src/routes/review.routes.js
const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const reviewCtrl = require('../controllers/review.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate.middleware')
const multer = require('multer')
const { addReviewSchema, editReviewSchema } = require('../validators/review.validator')

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
})

// Rate limiting for review creation and editing (prevent spam)
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: { success: false, message: 'Too many reviews. Please try again after an hour.' }
})

router.post('/', authenticate, reviewLimiter, validate(addReviewSchema), reviewCtrl.addReview)
router.put('/:id', authenticate, reviewLimiter, validate(editReviewSchema), reviewCtrl.editReview)
router.delete('/:id', authenticate, reviewCtrl.deleteReview)

// Upload up to 5 images per review
router.post('/:id/images', authenticate, upload.array('images', 5), reviewCtrl.uploadReviewImages)

router.post('/:id/helpful', authenticate, reviewCtrl.toggleHelpful)
router.post('/:id/report', authenticate, reviewCtrl.reportReview)

router.get('/target/:targetType/:targetId', optionalAuth, reviewCtrl.getTargetReviews)

module.exports = router
