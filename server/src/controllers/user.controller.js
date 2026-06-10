// server/src/controllers/user.controller.js
const User         = require('../models/User.model')
const Trip         = require('../models/Trip.model')
const Notification = require('../models/Notification.model')
const { success, notFound, badRequest } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const { uploadImageBuffer } = require('../services/cloudinary.service')

exports.getMe = asyncHandler(async (req, res) => {
  success(res, req.user)
})

exports.updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'bio', 'location', 'travelInterests', 'favoriteDestinations']
  const updates = {}
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
  success(res, user, 'Profile updated')
})

exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'No image file provided')

  try {
    const avatarUrl = await uploadImageBuffer(req.file.buffer)
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true })
    success(res, user, 'Avatar uploaded successfully')
  } catch (error) {
    badRequest(res, 'Failed to upload image to Cloudinary')
  }
})

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash -followers -following')
  if (!user) return notFound(res, 'User not found')
  success(res, user)
})

exports.getUserTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({ userId: req.params.id, isPublic: true }).sort({ createdAt: -1 }).limit(20).lean()
  success(res, { trips })
})

exports.followUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id
  if (targetId === String(req.user._id)) return badRequest(res, 'Cannot follow yourself')

  const target = await User.findById(targetId)
  if (!target) return notFound(res, 'User not found')

  const isFollowing = req.user.following?.includes(targetId)

  if (isFollowing) {
    await User.updateOne({ _id: req.user._id }, { $pull: { following: targetId }, $inc: { followingCount: -1 } })
    await User.updateOne({ _id: targetId },     { $pull: { followers: req.user._id }, $inc: { followersCount: -1 } })
  } else {
    await User.updateOne({ _id: req.user._id }, { $addToSet: { following: targetId }, $inc: { followingCount: 1 } })
    await User.updateOne({ _id: targetId },     { $addToSet: { followers: req.user._id }, $inc: { followersCount: 1 } })
    await Notification.create({ userId: targetId, type: 'follow', message: `${req.user.name} started following you`, actor: req.user._id })
  }

  success(res, { isFollowing: !isFollowing }, isFollowing ? 'Unfollowed' : 'Followed')
})
