# MessMeter 🍽️

> Mobile-first MERN PWA for hostel mess menu ratings, daily verdicts, dish leaderboards, and mess committee disliked dish reports.

---

## 🌟 Key Features

- **Daily Verdicts & Drag-Dish Warnings**: Calculates real-time meal verdicts (**Go for it** / **Meh** / **Skip it**) using Wilson score confidence intervals ($z=1.44$). Automatically detects and highlights specific dishes dragging down a meal's rating.
- **One-Standing-Vote System**: Users cast binary 👍/👎 votes per dish with instant optimistic UI updates and rollback handling.
- **Dish Leaderboard**: Ranked table of dishes sorted by Wilson lower-bound approval score with 🥇🥈🥉 medal designations.
- **Interactive 7-Day Menu Manager**: Full-width responsive weekly schedule grid for admins across Breakfast, Lunch, Snacks, and Dinner with live dish autocomplete and versioning.
- **Mess Committee Disliked Dishes Report**: Dedicated printable report identifying the most disliked menu items with print-optimized styling (`window.print()`).
- **Multi-Tenant Architecture**: Every dish, menu, user, and vote is strictly partitioned by `messId` with join-code validation.
- **Dual Authentication**: 1-Click Instant Demo Login (User & Admin) + Google OAuth integration with domain restriction support.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, React Router 7, Vanilla CSS design tokens (responsive dark mode food aesthetic, glassmorphism, micro-animations)
- **Backend**: Node.js, Express, MongoDB Atlas, Mongoose
- **Security & Auth**: HTTP-only JWT cookies, Google Auth Library, rate limiting

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 20.0.0
- MongoDB Atlas cluster connection string

### 2. Environment Setup

**Backend** (`backend/.env`):
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
DEV_AUTH=true
MESS_TZ=Asia/Kolkata
PORT=5000
```

**Client** (`client/.env`):
```env
VITE_DEV_AUTH=true
VITE_GOOGLE_CLIENT_ID=
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Seed Demo Data
Populate demo mess (`DEMO01`), 25 dishes, 12 users, weekly menu schedule, and historical votes:
```bash
cd backend
npm run seed:demo
```

### 5. Run the Application
In separate terminal windows:
```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Vite Client
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Testing

- **Backend Unit Tests**: `cd backend && npm test`
- **End-to-End Smoke Tests**: `cd backend && npm run smoke`
- **Production Client Build**: `cd client && npm run build`
