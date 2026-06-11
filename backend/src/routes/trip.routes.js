// server/src/routes/trip.routes.js
const router    = require('express').Router()
const tripCtrl  = require('../controllers/trip.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const validate  = require('../middleware/validate.middleware')
const { createTripSchema, saveItinerarySchema, itineraryDaySchema } = require('../validators/trip.validator')

// Core trip CRUD
router.post('/',              authenticate, validate(createTripSchema), tripCtrl.createTrip)
router.get('/my-trips',       authenticate, tripCtrl.getMyTrips)
router.get('/:id',            optionalAuth, tripCtrl.getTrip)
router.put('/:id',            authenticate, tripCtrl.updateTrip)
router.delete('/:id',         authenticate, tripCtrl.deleteTrip)

// Social features
router.post('/:id/like',      authenticate, tripCtrl.likeTrip)
router.post('/:id/save',      authenticate, tripCtrl.saveTrip)
router.post('/:id/comment',   authenticate, tripCtrl.addComment)
router.post('/:id/clone',     authenticate, tripCtrl.cloneTrip)

// Share trip (generate public URL)
router.post('/:id/share',     authenticate, tripCtrl.shareTrip)

// Itinerary management
router.put('/:id/itinerary',            authenticate, validate(saveItinerarySchema), tripCtrl.saveItinerary)
router.post('/:id/itinerary/day',       authenticate, validate(itineraryDaySchema),  tripCtrl.addItineraryDay)
router.put('/:id/itinerary/day/:day',   authenticate, tripCtrl.updateItineraryDay)
router.delete('/:id/itinerary/day/:day',authenticate, tripCtrl.deleteItineraryDay)

module.exports = router
