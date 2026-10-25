# UniMate

A student platform for university life: build your class routine, track your CGPA and exams, share notes and past papers, review teachers, share rides to campus, and find study help.

## Features

| Feature | What it does |
|---|---|
| Accounts | Sign up and log in. Only university email domains are accepted (set with `ALLOWED_EMAIL_DOMAINS`). |
| Routine builder | Add classes, labs and tutorials to a weekly timetable. Overlapping slots are flagged as clashes. |
| CGPA and exams | Record results to get your CGPA and per-semester GPA, try a what-if calculator, and count down to upcoming exams. |
| Course resources | Upload files or share links by course code, then search and download them. |
| Faculty reviews | Rate teachers (anonymously by default). Reviews are summarised into pros and cons, using Claude when an API key is set. A word filter blocks abuse and phone numbers. |
| Ride sharing | Offer or join rides with a seat limit and an even fare split. Joining is a single atomic update, so the last seat can't be double-booked. |
| Study help and tutoring | Post help requests, list yourself as a tutor, and message other students. |
| AI study assistant | Ask questions answered from the shared course notes (PDF and text files), with sources. Without an API key, it shows the most relevant passages instead. |

## Tech stack

- **Frontend:** React 19, React Router, Vite
- **Backend:** Node.js, Express 5, MongoDB with Mongoose, JWT auth, Multer uploads
- **AI (optional):** Claude API via `@anthropic-ai/sdk`

## Getting started

You need Node.js 20 or newer.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env    # then fill in MONGO_URI and JWT_SECRET
npm run dev
```

The API runs on http://localhost:5000.

To try the app without a MongoDB Atlas cluster, run `npm run dev:memory` instead. It starts a temporary in-memory database that is wiped when you stop the server.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. If the API runs somewhere else, set `VITE_API_URL` in `frontend/.env.local`.

### Environment variables

All backend settings are described in [`backend/.env.example`](backend/.env.example). The important ones:

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for signing login tokens (required in production) |
| `ALLOWED_EMAIL_DOMAINS` | Email domains allowed to sign up, for example `g.bracu.ac.bd,northsouth.edu` |
| `CORS_ORIGINS` | Frontend URL(s) allowed to call the API |
| `ANTHROPIC_API_KEY` | Optional. Turns on AI review summaries and AI answers |

Never commit `.env`. It is listed in `.gitignore`.

## Tests

```bash
cd backend
npm test
```

The tests run against an in-memory MongoDB and cover sign-up rules, routine clashes, CGPA maths, uploads and search, the study assistant, reviews, seat booking under concurrent joins, tutoring and chat.

## Project structure

```
backend/
  server.js            starts the API
  src/app.js           Express app and routes
  src/models/          Mongoose models
  src/routes/          one file per feature
  src/services/        AI, text extraction, search and moderation helpers
  test/                API tests
frontend/
  src/pages/           one page per feature
  src/api.js           API client
```
