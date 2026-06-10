// server/src/routes/notification.routes.js
const router = require('express').Router()
const notifCtrl = require('../controllers/notification.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.use(authenticate)
router.get('/', notifCtrl.getNotifications)
router.post('/read-all', notifCtrl.markAllRead)
router.patch('/:id/read', notifCtrl.markRead)

module.exports = router
