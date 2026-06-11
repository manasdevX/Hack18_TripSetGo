// server/src/routes/review.routes.js
const router = require('express').Router()
const reviewCtrl = require('../controllers/review.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const multer = require('multer')

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
})

router.post('/', authenticate, reviewCtrl.addReview)
router.put('/:id', authenticate, reviewCtrl.editReview)
router.delete('/:id', authenticate, reviewCtrl.deleteReview)

// Upload up to 5 images per review
router.post('/:id/images', authenticate, upload.array('images', 5), reviewCtrl.uploadReviewImages)

router.post('/:id/helpful', authenticate, reviewCtrl.toggleHelpful)
router.post('/:id/report', authenticate, reviewCtrl.reportReview)

router.get('/target/:targetType/:targetId', optionalAuth, reviewCtrl.getTargetReviews)

module.exports = router
