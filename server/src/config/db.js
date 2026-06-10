// server/src/config/db.js
const mongoose = require('mongoose')
const logger   = require('../utils/logger')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'tripsetgo',
    })
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    logger.error(`❌ MongoDB connection error: ${err.message}`)
    process.exit(1)
  }
}

mongoose.connection.on('disconnected', () => logger.warn('⚠️ MongoDB disconnected'))
mongoose.connection.on('error',        (err) => logger.error(`MongoDB error: ${err.message}`))

module.exports = connectDB
