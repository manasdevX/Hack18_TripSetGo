const User = require('../../models/User.model')
const AuditLog = require('../../models/AuditLog.model')
const { success, badRequest, notFound } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit
  const search = req.query.search || ''
  const role = req.query.role || ''
  const status = req.query.status || ''

  const query = {}
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }
  if (role) query.role = role
  if (status) query.status = status

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ])

  return success(res, {
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  })
})

exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['active', 'suspended', 'deleted'].includes(status)) {
    return badRequest(res, 'Invalid status value')
  }

  const user = await User.findById(id)
  if (!user) return notFound(res, 'User not found')

  user.status = status
  await user.save()

  await AuditLog.create({
    userId: req.user._id,
    action: 'ADMIN_UPDATE_USER_STATUS',
    status: 'success',
    details: { targetUserId: id, newStatus: status }
  })

  return success(res, user, 'User status updated successfully')
})

exports.updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { role } = req.body

  if (!['user', 'admin'].includes(role)) {
    return badRequest(res, 'Invalid role value')
  }

  const user = await User.findById(id)
  if (!user) return notFound(res, 'User not found')

  user.role = role
  await user.save()

  await AuditLog.create({
    userId: req.user._id,
    action: 'ADMIN_UPDATE_USER_ROLE',
    status: 'success',
    details: { targetUserId: id, newRole: role }
  })

  return success(res, user, 'User role updated successfully')
})

exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(id)
  if (!user) return notFound(res, 'User not found')

  user.status = 'deleted'
  await user.save()

  await AuditLog.create({
    userId: req.user._id,
    action: 'ADMIN_DELETE_USER',
    status: 'success',
    details: { targetUserId: id }
  })

  return success(res, null, 'User soft-deleted successfully')
})
