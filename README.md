# TripSetGo — AI-Powered Travel Planner

A full-stack MERN application that uses Gemini AI to generate personalised travel itineraries with live budget tracking, interactive maps, and social trip discovery.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Redux Toolkit, Tailwind CSS v4, Mapbox GL, Framer Motion |
| Backend | Node.js, Express 5, Mongoose 9, Socket.io |
| Database | MongoDB Atlas |
| AI | Google Gemini 2.0 Flash (with deterministic fallback) |
| Auth | JWT (15 min access token) + rotating refresh token (7 d, httpOnly cookie) |
| Payments | Razorpay |
| Storage | Cloudinary (avatar uploads) |
| Email | Nodemailer / SMTP |

## Project Structure

```
TripSetGo/
├── frontend/          # React 19 + Vite (runs on :3000)
│   └── src/
│       ├── app/       # Redux store
│       ├── components/  common/, layout/, map/
│       ├── features/  # Redux slices — auth, trips, planner, discover, ...
│       ├── hooks/     # useSocket, useMapbox, useDebounce, useTripCollaboration
│       ├── pages/     # Auth/, Dashboard/ (incl. Copilot), Home/, TripDetail/
│       ├── router/    # React Router v7 routes + guards
│       └── services/  # Axios instance with JWT refresh interceptor
└── backend/           # Express 5 API (runs on :5000)
    └── src/
        ├── config/    # MongoDB, Redis (optional), Elasticsearch (optional)
        ├── controllers/
        ├── middleware/ # auth, validate, errorHandler, cache, csrf
        ├── models/    # 14 Mongoose models
        ├── planning/  # Deterministic fallback planner
        ├── routes/    # 14 route groups
        ├── services/  # Gemini AI, Cloudinary, Nodemailer
        ├── utils/     # jwt, response, logger, asyncHandler
        └── validators/ # Joi schemas
```

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas cluster (free tier works)
- Google Gemini API key (optional — deterministic fallback is built-in)

### 1. Clone & install

```bash
git clone <repo-url>
cd TripSetGo
npm run install:all
```

### 2. Configure environment

Create `backend/.env`:

```env
# Required
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/tripsetgo
JWT_SECRET=<32-char-random-string>
REFRESH_TOKEN_SECRET=<different-32-char-random-string>
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Optional — features degrade gracefully without these
GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_MAPBOX_TOKEN=<your-mapbox-public-token>
VITE_GOOGLE_CLIENT_ID=<same-as-backend-GOOGLE_CLIENT_ID>
```

### 3. Run development

```bash
npm run dev          # starts both frontend (:3000) and backend (:5000) concurrently
# — or individually —
npm run dev:frontend
npm run dev:backend
```

### 4. Build for production

```bash
npm run build        # builds frontend to frontend/dist/
```

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Register + send OTP |
| POST | `/api/v1/auth/verify-otp` | Verify email OTP |
| POST | `/api/v1/auth/login` | Login → access + refresh token |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| POST | `/api/v1/auth/google-token` | Google OAuth one-tap |
| POST | `/api/v1/trips` | Generate AI trip plan |
| GET | `/api/v1/trips/my-trips` | Paginated user trips |
| GET | `/api/v1/trips/:id` | Public trip detail (optionalAuth) |
| POST | `/api/v1/trips/:id/share` | Make public + return share URL |
| POST | `/api/v1/trips/:id/clone` | Clone public trip |
| GET/POST/DELETE | `/api/v1/trips/:id/drafts` | Save / list / delete planner drafts |
| GET | `/api/v1/discover` | Public trip feed |
| POST | `/api/v1/planner/generate` | Detailed AI plan (standalone) |
| POST | `/api/v1/planner/regenerate-day` | Regenerate one itinerary day |
| POST | `/api/v1/copilot/chat` | Streaming (SSE) AI copilot reply |
| GET | `/api/v1/copilot/conversations` | List copilot conversations |
| GET/POST/DELETE | `/api/v1/groups` | Expense groups + members + expenses |
| GET | `/api/v1/health` | Health check |

## Key Features

- **AI Trip Planning** — Gemini 2.0 Flash generates transport options, hotel tiers, food plans, day-by-day itineraries, weather notes, and a packing list. Inputs include pace (relaxed/balanced/packed) and interests. Falls back to a deterministic engine when Gemini is unavailable.
- **Hero Planner controls** — regenerate any single day with AI (avoids repeating other days), lock days to preserve them, and save/compare multiple selection drafts side-by-side.
- **AI Copilot** — a context-aware travel assistant with streaming (SSE) replies, grounded in the user's current trip, budget, and recent destinations; conversations are persisted.
- **Live Budget Tracker** — Redux selector recomputes the live spend as you select transport, hotel, food, and activities.
- **Social Discovery** — Public trip feed with like, save, clone, and share-link features.
- **Interactive Map** — Mapbox GL renders trip routes and nearby hotels/restaurants/attractions, themed to match the app.
- **Real-time Notifications** — Socket.io broadcasts like/comment/collaboration notifications to the trip owner.
- **Subscriptions** — Razorpay-backed Free/Pro tiers with daily search limits.
- **Group Expenses** — Splitwise-style expense groups with per-person splits and minimal-transaction settlements.

## Security Hardening

- NoSQL injection protection — all auth inputs Joi-validated as strings (blocks `{"$gt":""}` attacks)
- JWT access token (15 min) + rotating refresh token (7 d, httpOnly, Secure, SameSite=Strict)
- Helmet, CORS, express-rate-limit (global 1000 req/15 min; auth routes stricter)
- `trust proxy 1` set for correct IP behind Nginx/reverse proxy
- Fail-fast boot validation — server exits with a clear error if critical env vars are missing

## Environment Variables Reference

See `.env` template in the Quick Start section above. The server warns at startup for any missing optional integration keys but continues running with graceful degradation.
