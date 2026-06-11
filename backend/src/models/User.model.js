// server/src/models/User.model.js
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:    { type: String, default: null },
  googleId:        { type: String, default: null, sparse: true },
  avatar:          { type: String, default: null },
  bio:             { type: String, default: '', maxlength: 300 },
  location:        { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  role:            { type: String, enum: ['user', 'admin'], default: 'user' },
  plan:            { type: String, enum: ['free', 'pro'], default: 'free' },
  followersCount:  { type: Number, default: 0 },
  followingCount:  { type: Number, default: 0 },
  tripsCount:      { type: Number, default: 0 },
  travelInterests: [{ type: String }],
  favoriteDestinations: [{ type: String }],
  reputationScore: { type: Number, default: 0 },
  badges:          [{ type: String }],
  status:          { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
  followers:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next()
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12)
  next()
})

// Compare password
userSchema.methods.comparePassword = async function (plain) {
  if (!this.passwordHash) return false
  return bcrypt.compare(plain, this.passwordHash)
}

// Remove sensitive fields from JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.followers
  delete obj.following
  return obj
}

userSchema.index({ email: 1 })
userSchema.index({ googleId: 1 }, { sparse: true })

module.exports = mongoose.model('User', userSchema)
