// server/src/routes/trip.routes.js
const router = require('express').Router()
const tripCtrl = require('../controllers/trip.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')

router.post('/',              authenticate, tripCtrl.createTrip)
router.get('/my-trips',       authenticate, tripCtrl.getMyTrips)
router.get('/:id',            optionalAuth, tripCtrl.getTrip)
router.put('/:id',            authenticate, tripCtrl.updateTrip)
router.delete('/:id',         authenticate, tripCtrl.deleteTrip)
router.post('/:id/like',      authenticate, tripCtrl.likeTrip)
router.post('/:id/save',      authenticate, tripCtrl.saveTrip)
router.post('/:id/comment',   authenticate, tripCtrl.addComment)
router.post('/:id/clone',     authenticate, tripCtrl.cloneTrip)

module.exports = router
