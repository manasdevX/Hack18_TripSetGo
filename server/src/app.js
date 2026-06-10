// server/src/app.js
const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const morgan       = require('morgan')
const cookieParser = require('cookie-parser')
const compression  = require('compression')
const http         = require('http')
const { Server }   = require('socket.io')

const routes       = require('./routes')
const errorHandler = require('./middleware/errorHandler.middleware')
const logger       = require('./utils/logger')

const app = express()
const server = http.createServer(app)

// Socket.io setup for real-time notifications
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})

// Keep track of connected users { userId: socketId }
const activeUsers = new Map()

io.on('connection', (socket) => {
  socket.on('join', ({ user_id }) => {
    if (user_id) activeUsers.set(user_id, socket.id)
  })

  socket.on('disconnect', () => {
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) activeUsers.delete(userId)
    }
  })
})

// Attach socket io to req so controllers can emit events
app.use((req, res, next) => {
  req.io = io
  req.activeUsers = activeUsers
  next()
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging via Winston
app.use(morgan('short', {
  stream: { write: (message) => logger.http(message.trim()) },
}))

// Routes
app.use('/api/v1', routes)

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint Not Found' })
})

// Error Handler
app.use(errorHandler)

module.exports = { app, server }
