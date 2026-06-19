// server/src/scripts/get_otp.js
require('dotenv').config()
const mongoose = require('mongoose')
const OTP = require('../models/OTP.model')

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'tripsetgo' })
  const latest = await OTP.findOne().sort({ createdAt: -1 })
  if (latest) {
    console.log(`Latest OTP for ${latest.email}: ${latest.otp}`)
  } else {
    console.log('No OTP found in database')
  }
  await mongoose.disconnect()
}

run().catch(console.error)
