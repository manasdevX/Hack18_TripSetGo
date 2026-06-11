// server/src/validators/auth.validator.js
// Joi schemas for auth endpoints. Beyond UX validation, forcing these fields to
// be strings is a security control: it blocks NoSQL operator-object injection
// (e.g. { email: { $gt: "" } }) from ever reaching a Mongoose query.
const Joi = require('joi')

const email = Joi.string().trim().lowercase().email().max(254).required()
const otp   = Joi.string().trim().pattern(/^\d{6}$/).required()
  .messages({ 'string.pattern.base': 'OTP must be a 6-digit code' })

const signupSchema = {
  body: Joi.object({
    name:     Joi.string().trim().min(2).max(80).required(),
    email,
    password: Joi.string().min(8).max(128).required(),
  }),
}

const loginSchema = {
  body: Joi.object({
    email,
    password: Joi.string().min(1).max(128).required(),
  }),
}

const verifyOtpSchema = {
  body: Joi.object({ email, otp }),
}

const forgotPasswordSchema = {
  body: Joi.object({ email }),
}

const resetPasswordSchema = {
  body: Joi.object({
    email,
    otp,
    newPassword: Joi.string().min(8).max(128).required(),
  }),
}

const googleTokenSchema = {
  body: Joi.object({ token: Joi.string().required() }),
}

module.exports = {
  signupSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleTokenSchema,
}
