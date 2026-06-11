// server/src/routes/subscription.routes.js
const router = require('express').Router()
const subCtrl = require('../controllers/subscription.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.use(authenticate)
router.get('/plans',          subCtrl.getPlans)
router.get('/status',         subCtrl.getStatus)
router.post('/create-order',  subCtrl.createOrder)
router.post('/verify-payment', subCtrl.verifyPayment)

module.exports = router
