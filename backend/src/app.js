// server/src/app.js
const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const morgan       = require('morgan')
const cookieParser = require('cookie-parser')
const compression  = require('compression')
const http         = require('http')
const { Server }   = require('socket.io')
const rateLimit    = require('express-rate-limit')

const routes       = require('./routes')
const errorHandler = require('./middleware/errorHandler.middleware')
const logger       = require('./utils/logger')

const app = express()
const server = http.createServer(app)

// Trust the first proxy hop (nginx / load balancer) so req.ip, secure cookies,
// and express-rate-limit key off the real client IP in production.
app.set('trust proxy', 1)

// Build the allowed origins list from env.
// CLIENT_URL can be a comma-separated list of origins, e.g.:
//   http://localhost:3000,https://your-app.vercel.app
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server / curl calls (origin is undefined) in dev
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    }
  },
  credentials: true,
}

// Socket.io setup for real-time notifications
const io = new Server(server, {
  cors: corsOptions,
})

// Keep track of connected users { userId: socketId }
const activeUsers = new Map()
// Keep track of users inside each trip room { tripId: Map(socketId -> { userId, name, avatar }) }
const tripRooms = new Map()

io.on('connection', (socket) => {
  socket.on('join', ({ user_id }) => {
    if (user_id) activeUsers.set(user_id, socket.id)
  })

  // Collaborative Room Join
  socket.on('join_trip', ({ tripId, userId, name, avatar }) => {
    socket.join(`trip_room:${tripId}`)
    if (!tripRooms.has(tripId)) {
      tripRooms.set(tripId, new Map())
    }
    tripRooms.get(tripId).set(socket.id, { userId, name, avatar })

    // Broadcast updated presence list
    const users = Array.from(tripRooms.get(tripId).values())
    io.to(`trip_room:${tripId}`).emit('presence_change', { users })
  })

  // Collaborative Room Leave
  socket.on('leave_trip', ({ tripId }) => {
    socket.leave(`trip_room:${tripId}`)
    if (tripRooms.has(tripId)) {
      tripRooms.get(tripId).delete(socket.id)
      if (tripRooms.get(tripId).size === 0) {
        tripRooms.delete(tripId)
      } else {
        const users = Array.from(tripRooms.get(tripId).values())
        io.to(`trip_room:${tripId}`).emit('presence_change', { users })
      }
    }
  })

  socket.on('disconnect', () => {
    // Clean active global users map
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) activeUsers.delete(userId)
    }

    // Clean trip room presence
    for (const [tripId, roomUsers] of tripRooms.entries()) {
      if (roomUsers.has(socket.id)) {
        roomUsers.delete(socket.id)
        if (roomUsers.size === 0) {
          tripRooms.delete(tripId)
        } else {
          const users = Array.from(roomUsers.values())
          io.to(`trip_room:${tripId}`).emit('presence_change', { users })
        }
      }
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
app.use(cors(corsOptions))
app.use(compression())
app.use(cookieParser())

const { csrfProtection, setCsrfToken } = require('./middleware/csrf.middleware')
app.use(setCsrfToken)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/api', csrfProtection)

// Global Rate Limiting for all /api routes
// This protects the server from DDoS attacks by limiting IP traffic
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
})
app.use('/api', globalLimiter)

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
