// server/src/routes/copilot.routes.js
const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const ctrl = require('../controllers/copilot.controller')
const { authenticate } = require('../middleware/auth.middleware')

// Each chat turn is an AI call — cap to deter abuse / runaway cost.
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 120,
  message: { success: false, message: 'Too many copilot requests. Please slow down and try again later.' },
})

router.use(authenticate)

router.post('/chat', chatLimiter, ctrl.streamChat)
router.get('/conversations', ctrl.listConversations)
router.get('/conversations/:id/messages', ctrl.getMessages)
router.delete('/conversations/:id', ctrl.deleteConversation)

module.exports = router
