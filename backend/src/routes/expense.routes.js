// server/src/routes/expense.routes.js
const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const ctrl = require('../controllers/expense.controller')
const { authenticate } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate.middleware')
const { createGroupSchema, addMemberSchema, addExpenseSchema } = require('../validators/expense.validator')

// Mutations are user-scoped writes; cap them to deter abuse.
const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})

// Everything here requires an authenticated user.
router.use(authenticate)

router.get('/', ctrl.getMyGroups)
router.post('/', writeLimiter, validate(createGroupSchema), ctrl.createGroup)

router.get('/:id', ctrl.getGroup)
router.delete('/:id', ctrl.deleteGroup)

router.post('/:id/members', writeLimiter, validate(addMemberSchema), ctrl.addMember)
router.post('/:id/expenses', writeLimiter, validate(addExpenseSchema), ctrl.addExpense)
router.delete('/:groupId/expenses/:expenseId', ctrl.deleteExpense)

module.exports = router
