// server/src/controllers/expense.controller.js
// Group expense splitting (Splitwise-style): groups own members + expenses,
// and the API returns per-member balances plus a minimal set of settlement
// transactions so the frontend never has to recompute money math.
const Group   = require('../models/Group.model')
const Expense = require('../models/Expense.model')
const User    = require('../models/User.model')
const Trip    = require('../models/Trip.model')
const asyncHandler = require('../utils/asyncHandler')
const { success, created, notFound, forbidden, badRequest } = require('../utils/response')

const idStr = (v) => (v && v._id ? v._id.toString() : v ? v.toString() : '')

const isGroupMember = (group, userId) => {
  const uid = userId.toString()
  if (idStr(group.ownerId) === uid) return true
  return (group.members || []).some((m) => idStr(m) === uid)
}

// Build the set of member ids that can legally pay for / be split on an expense.
const memberIdSet = (group) => {
  const set = new Set((group.members || []).map(idStr))
  set.add(idStr(group.ownerId))
  set.delete('')
  return set
}

// Net balance per member (paid − fair share), then greedily reduce to the
// fewest possible "A pays B" transactions.
const computeSettlements = (expenses, memberIds) => {
  const balances = {}
  memberIds.forEach((m) => { balances[idStr(m)] = 0 })

  expenses.forEach((e) => {
    const split = (e.splitAmong || []).map(idStr).filter(Boolean)
    if (!split.length) return
    const share = e.amount / split.length
    const payer = idStr(e.paidBy)
    if (balances[payer] === undefined) balances[payer] = 0
    balances[payer] += e.amount
    split.forEach((m) => {
      if (balances[m] === undefined) balances[m] = 0
      balances[m] -= share
    })
  })

  const round = (n) => Math.round(n * 100) / 100
  Object.keys(balances).forEach((k) => { balances[k] = round(balances[k]) })

  const debtors = []
  const creditors = []
  Object.entries(balances).forEach(([id, bal]) => {
    if (bal < -0.009) debtors.push({ id, amt: -bal })
    else if (bal > 0.009) creditors.push({ id, amt: bal })
  })
  debtors.sort((a, b) => b.amt - a.amt)
  creditors.sort((a, b) => b.amt - a.amt)

  const settlements = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt)
    settlements.push({ from: debtors[i].id, to: creditors[j].id, amount: round(pay) })
    debtors[i].amt -= pay
    creditors[j].amt -= pay
    if (debtors[i].amt < 0.01) i += 1
    if (creditors[j].amt < 0.01) j += 1
  }

  return { balances, settlements }
}

// GET /groups — every group the user owns or belongs to, with rollups.
const getMyGroups = asyncHandler(async (req, res) => {
  const uid = req.user._id
  const groups = await Group.find({ $or: [{ ownerId: uid }, { members: uid }], isActive: true })
    .populate('members', 'name email avatar')
    .populate('tripId', 'destination')
    .sort({ updatedAt: -1 })
    .lean()

  const ids = groups.map((g) => g._id)
  const agg = ids.length
    ? await Expense.aggregate([
        { $match: { groupId: { $in: ids } } },
        { $group: { _id: '$groupId', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ])
    : []
  const byId = {}
  agg.forEach((a) => { byId[a._id.toString()] = a })

  const result = groups.map((g) => ({
    ...g,
    expenseCount: byId[g._id.toString()]?.count || 0,
    totalSpent: byId[g._id.toString()]?.total || 0,
  }))
  return success(res, result, 'Groups fetched')
})

// POST /groups
const createGroup = asyncHandler(async (req, res) => {
  const { name, tripId, memberEmails = [], currency } = req.body
  const ownerId = req.user._id

  let memberIds = []
  let unresolved = []
  if (memberEmails.length) {
    const wanted = memberEmails.map((e) => e.toLowerCase())
    const users = await User.find({ email: { $in: wanted } }).select('_id email')
    const found = new Set(users.map((u) => u.email.toLowerCase()))
    memberIds = users.map((u) => u._id)
    unresolved = memberEmails.filter((e) => !found.has(e.toLowerCase()))
  }

  // Only link a trip the requester actually owns.
  let linkedTrip = null
  if (tripId) {
    const trip = await Trip.findById(tripId).select('_id userId')
    if (trip && idStr(trip.userId) === ownerId.toString()) linkedTrip = trip._id
  }

  const memberMap = new Map([[ownerId.toString(), ownerId]])
  memberIds.forEach((id) => memberMap.set(id.toString(), id))

  let group = await Group.create({
    name,
    tripId: linkedTrip,
    ownerId,
    members: Array.from(memberMap.values()),
    currency: currency || 'INR',
  })
  group = await group.populate('members', 'name email avatar')

  return created(res, { group, unresolved }, 'Group created')
})

// GET /groups/:id — group + expenses + balances + settlements.
const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('members', 'name email avatar')
    .populate('tripId', 'destination source')
  if (!group) return notFound(res, 'Group not found')
  if (!isGroupMember(group, req.user._id)) return forbidden(res, 'You are not a member of this group')

  const expenses = await Expense.find({ groupId: group._id })
    .populate('paidBy', 'name avatar')
    .populate('splitAmong', 'name avatar')
    .sort({ createdAt: -1 })

  const { balances, settlements } = computeSettlements(expenses, group.members.map((m) => m._id))
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return success(res, { group, expenses, balances, settlements, total }, 'Group fetched')
})

// POST /groups/:id/members — add an existing registered user by email.
const addMember = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
  if (!group) return notFound(res, 'Group not found')
  if (idStr(group.ownerId) !== req.user._id.toString()) return forbidden(res, 'Only the group owner can add members')

  const email = req.body.email.toLowerCase()
  const user = await User.findOne({ email }).select('_id name email avatar')
  if (!user) return notFound(res, 'No registered user with that email')
  if (isGroupMember(group, user._id)) return badRequest(res, 'That user is already a member')

  group.members.push(user._id)
  await group.save()
  const populated = await group.populate('members', 'name email avatar')
  return success(res, populated, 'Member added')
})

// POST /groups/:id/expenses
const addExpense = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
  if (!group) return notFound(res, 'Group not found')
  if (!isGroupMember(group, req.user._id)) return forbidden(res, 'You are not a member of this group')

  const { title, amount, category, paidBy, splitAmong, note } = req.body
  const allowed = memberIdSet(group)
  if (!allowed.has(paidBy)) return badRequest(res, 'The payer must be a member of this group')
  if (!splitAmong.every((m) => allowed.has(m))) return badRequest(res, 'Everyone in the split must be a group member')

  let expense = await Expense.create({
    groupId: group._id,
    title,
    amount,
    category: category || 'misc',
    paidBy,
    splitAmong,
    note: note || '',
    currency: group.currency,
  })
  expense = await expense.populate([
    { path: 'paidBy', select: 'name avatar' },
    { path: 'splitAmong', select: 'name avatar' },
  ])

  return created(res, expense, 'Expense added')
})

// DELETE /groups/:groupId/expenses/:expenseId
const deleteExpense = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId)
  if (!group) return notFound(res, 'Group not found')
  if (!isGroupMember(group, req.user._id)) return forbidden(res, 'You are not a member of this group')

  const expense = await Expense.findOne({ _id: req.params.expenseId, groupId: group._id })
  if (!expense) return notFound(res, 'Expense not found')
  await expense.deleteOne()

  return success(res, { _id: expense._id }, 'Expense deleted')
})

// DELETE /groups/:id — owner only; cascades to its expenses.
const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
  if (!group) return notFound(res, 'Group not found')
  if (idStr(group.ownerId) !== req.user._id.toString()) return forbidden(res, 'Only the owner can delete this group')

  await Expense.deleteMany({ groupId: group._id })
  await group.deleteOne()

  return success(res, { _id: group._id }, 'Group deleted')
})

module.exports = {
  getMyGroups,
  createGroup,
  getGroup,
  addMember,
  addExpense,
  deleteExpense,
  deleteGroup,
}
