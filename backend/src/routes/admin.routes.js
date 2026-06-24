// server/src/routes/admin.routes.js
const router = require('express').Router()
const { authenticate, authorize } = require('../middleware/auth.middleware')

// Import modular controllers
const analyticsCtrl = require('../controllers/admin/admin.analytics.controller')
const usersCtrl = require('../controllers/admin/admin.users.controller')
const reviewsCtrl = require('../controllers/admin/admin.reviews.controller')
const destinationsCtrl = require('../controllers/admin/admin.destinations.controller')
const reportsCtrl = require('../controllers/admin/admin.reports.controller')

// All routes require authentication and admin privileges
router.use(authenticate, authorize('admin'))

// Analytics
router.get('/analytics', analyticsCtrl.getAnalytics)

// User Management
router.get('/users', usersCtrl.getUsers)
router.put('/users/:id/status', usersCtrl.updateUserStatus)
router.put('/users/:id/role', usersCtrl.updateUserRole)
router.delete('/users/:id', usersCtrl.deleteUser)

// Review Management
router.get('/reviews', reviewsCtrl.getReviews)
router.delete('/reviews/:id', reviewsCtrl.deleteReview)

// Destination Management
router.get('/destinations', destinationsCtrl.getDestinations)
router.post('/destinations', destinationsCtrl.createDestination)
router.put('/destinations/:type/:id', destinationsCtrl.updateDestination)
router.delete('/destinations/:type/:id', destinationsCtrl.deleteDestination)

// Reports & Audit Logs
router.get('/reports', reportsCtrl.getReports)
router.get('/export/users', reportsCtrl.exportUsersCSV)

// Queues Dashboard
const queueAdminRouter = require('./queueAdmin.routes')
router.use('/queues', queueAdminRouter)

module.exports = router
