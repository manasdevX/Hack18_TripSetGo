const User = require('../../models/User.model')
const AuditLog = require('../../models/AuditLog.model')
const { success } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

exports.getReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const skip = (page - 1) * limit

  const [auditLogs, total] = await Promise.all([
    AuditLog.find().populate('userId', 'name email').sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(),
  ])

  return success(res, {
    auditLogs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  })
})

exports.exportUsersCSV = asyncHandler(async (req, res) => {
  const users = await User.find().select('name email role plan status createdAt').lean()

  let csv = 'Name,Email,Role,Plan,Status,JoinedDate\n'
  users.forEach(u => {
    csv += `"${u.name}","${u.email}","${u.role}","${u.plan}","${u.status}","${u.createdAt.toISOString()}"\n`
  })

  res.header('Content-Type', 'text/csv')
  res.attachment('users_report.csv')
  return res.send(csv)
})
