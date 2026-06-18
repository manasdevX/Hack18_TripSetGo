// server/src/routes/search.routes.js
const router     = require('express').Router()
const searchCtrl = require('../controllers/search.controller')
const cache      = require('../middleware/cache.middleware')

// ── MongoDB Routes (backward compatible) ──────────────────────────────────────
// Per-endpoint caching with namespace-specific TTLs:
//   hotels, restaurants, attractions → 30 min (data rarely changes)
//   city overview                    → 15 min
//   nearby                           → 10 min (geo-sensitive)

router.get('/hotels',       cache('hotels'),        searchCtrl.searchHotels)
router.get('/restaurants',  cache('restaurants'),   searchCtrl.searchRestaurants)
router.get('/attractions',  cache('attractions'),   searchCtrl.searchAttractions)
router.get('/nearby',       cache('search:nearby'), searchCtrl.searchNearby)
router.get('/city/:city',   cache('search:city'),   searchCtrl.searchCityOverview)

// ── Elasticsearch Routes ──────────────────────────────────────────────────────
// All ES routes are prefixed with /es/ and cached for 5 min (search:es TTL).
//
// Full-text + fuzzy search per index:
//   GET /es/hotels?q=&city=&minStar=&minPrice=&maxPrice=&fuzzy=true&sort=rating&page=1&limit=10
//   GET /es/restaurants?q=&city=&cuisine=&diet=&minPrice=&maxPrice=&fuzzy=true
//   GET /es/attractions?q=&city=&category=&maxPrice=&fuzzy=true
//   GET /es/reviews?q=&targetType=&targetId=&minRating=&verified=true
//
// Autocomplete (live-typing):
//   GET /es/autocomplete?q=gran&index=hotels&size=8
//
// Cross-index multi-search:
//   GET /es/all?q=beach&fuzzy=true&size=5

router.get('/es/hotels',       cache('search:es'), searchCtrl.esSearchHotels)
router.get('/es/restaurants',  cache('search:es'), searchCtrl.esSearchRestaurants)
router.get('/es/attractions',  cache('search:es'), searchCtrl.esSearchAttractions)
router.get('/es/reviews',      cache('search:es'), searchCtrl.esSearchReviews)
router.get('/es/autocomplete', cache('search:es'), searchCtrl.esAutocomplete)
router.get('/es/all',          cache('search:es'), searchCtrl.esMultiSearch)

module.exports = router
