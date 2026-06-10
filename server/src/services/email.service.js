// server/src/services/email.service.js
const nodemailer = require('nodemailer')
const logger     = require('../utils/logger')

// Use a real SMTP service in production (SendGrid, SES, Mailgun)
// For development, we'll configure a generic transporter or Ethereal
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const sendEmail = async (to, subject, html) => {
  if (!process.env.SMTP_USER) {
    logger.warn(`Email simulated to ${to} (Subject: ${subject})`)
    return true
  }
  try {
    await transporter.sendMail({
      from: `"TripSetGo" <${process.env.SMTP_FROM || 'noreply@tripsetgo.com'}>`,
      to, subject, html
    })
    logger.info(`📧 Email sent to ${to}`)
    return true
  } catch (err) {
    logger.error(`❌ Email error: ${err.message}`)
    return false
  }
}

exports.sendOTP = async (email, name, otp) => {
  const html = `
    <h2>Welcome to TripSetGo, ${name}!</h2>
    <p>Your email verification code is:</p>
    <h1 style="letter-spacing: 5px; color: #6366f1;">${otp}</h1>
    <p>This code expires in 10 minutes.</p>
  `
  return sendEmail(email, 'Verify your TripSetGo account', html)
}

exports.sendPasswordResetOTP = async (email, name, otp) => {
  const html = `
    <h2>Password Reset Request</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Here is your OTP:</p>
    <h1 style="letter-spacing: 5px; color: #f59e0b;">${otp}</h1>
    <p>If you didn't request this, please ignore this email.</p>
  `
  return sendEmail(email, 'Reset your TripSetGo password', html)
}
