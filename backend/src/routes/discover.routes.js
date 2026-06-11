// server/src/routes/discover.routes.js
const router = require('express').Router()
const discoverCtrl = require('../controllers/discover.controller')
const { optionalAuth } = require('../middleware/auth.middleware')

router.get('/feed',     optionalAuth, discoverCtrl.getFeed)
router.get('/search',   optionalAuth, discoverCtrl.search)
router.get('/trending', discoverCtrl.getTrending)

module.exports = router
