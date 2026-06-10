// server/server.js
require('dotenv').config()
const { server } = require('./src/app')
const connectDB  = require('./src/config/db')
const logger     = require('./src/utils/logger')

const PORT = process.env.PORT || 5000

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...')
  logger.error(err.name, err.message)
  process.exit(1)
})

// Connect to MongoDB & Start Server
connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`🚀 TripSetGo Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
  })
})

// Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...')
  logger.error(err.name, err.message)
  server.close(() => {
    process.exit(1)
  })
})
