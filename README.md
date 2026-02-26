# Trading Academy — Local MVP

A full-stack trading education web app with structured lessons, quizzes, spaced repetition, chart drills, and a trade journal.

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + TradingView Lightweight Charts
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL 15
- **Auth**: JWT (email/password)

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Local Setup (Step-by-Step)

### 1. Start PostgreSQL

```bash
cd trading-academy
docker compose up -d
```

Wait for the health check to pass (~10 seconds):

```bash
docker compose ps
# postgres should show: healthy
```

### 2. Configure the server environment

```bash
cd server
cp .env.example .env
```

The default `.env` already matches the docker-compose credentials — no edits needed for local dev.

### 3. Install server dependencies

```bash
cd server
npm install
```

### 4. Run database migrations

```bash
npm run migrate
```

### 5. Seed the database

Inserts all levels, lessons, questions, and practice drills:

```bash
npm run seed
```

### 6. Start the server

```bash
npm run dev
```

Server runs on **http://localhost:3001**

### 7. Install client dependencies (new terminal)

```bash
cd ../client
npm install
```

### 8. Start the client

```bash
npm run dev
```

Client runs on **http://localhost:5173**

---

## App Structure

```
trading-academy/
├── docker-compose.yml
├── server/
│   ├── src/
│   │   ├── db/
│   │   │   ├── migrations/001_initial.sql
│   │   │   ├── seeds/seed.ts
│   │   │   ├── index.ts         # pg Pool
│   │   │   └── migrate.ts       # migration runner
│   │   ├── middleware/auth.ts   # JWT verify
│   │   ├── routes/              # all API routes
│   │   ├── types/index.ts
│   │   └── index.ts             # Express app
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── client/
    ├── src/
    │   ├── api/client.ts        # Axios instance
    │   ├── store/auth.ts        # Zustand auth store
    │   ├── components/          # shared UI components
    │   └── pages/               # all route pages
    ├── package.json
    └── vite.config.ts
```

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Get JWT token |
| GET | /api/levels | All learning levels |
| GET | /api/levels/:id/lessons | Lessons in a level |
| GET | /api/lessons/:id | Single lesson |
| POST | /api/quiz/submit | Submit quiz answers |
| GET | /api/practice/daily | Daily practice queue |
| POST | /api/practice/daily/submit | Submit practice answers |
| GET | /api/drills | Chart practice drills |
| POST | /api/drills/:id/submit | Submit drill attempt |
| GET/POST/PUT/DELETE | /api/journal | Trade journal CRUD |
| GET | /api/journal/stats | Journal statistics |
| GET | /api/dashboard | Full dashboard data |

---

## Features

- **5 Learning Levels**: Foundations → Price Action → Liquidity & Market Structure → Volume Profile → Strategy & Risk
- **30 Lessons** with original content, visuals, common mistakes, and key takeaways
- **150+ Quiz Questions** (multiple choice, true/false, visual identification)
- **Spaced Repetition**: lessons with score < 70% queue for review; SM-2-inspired scheduling
- **Daily Practice Mode**: 5 questions pulled from weak topics
- **Chart Drills**: 5 pre-authored candlestick exercises with tolerance-based auto-scoring
- **Trade Journal**: log trades with full RR analysis and mistake tagging
- **Dashboard**: streak, mastery by topic, progress by level, review queue count

---

## pgAdmin

Access the database GUI at **http://localhost:5050**

- Email: `admin@trading.local`
- Password: `admin`

Add a new server connection:
- Host: `postgres` (or `localhost` if connecting from outside Docker)
- Port: `5432`
- Database: `trading_academy`
- Username: `trading_user`
- Password: `trading_pass`
