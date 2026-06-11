// server/src/routes/search.routes.js
const router = require('express').Router()
const searchCtrl = require('../controllers/search.controller')
const cache = require('../middleware/cache.middleware')

// Apply cache middleware to all search endpoints
router.use(cache)

router.get('/hotels',       searchCtrl.searchHotels)
router.get('/restaurants',  searchCtrl.searchRestaurants)
router.get('/attractions',  searchCtrl.searchAttractions)
router.get('/nearby',       searchCtrl.searchNearby)
router.get('/city/:city',   searchCtrl.searchCityOverview)

module.exports = router
