# 🃏 Planning Poker

Lightweight real-time planning poker for distributed teams. No login, no story management — just join a room and estimate.

## Features

- **Rooms via UUID** – create a room, share the link, others join by entering their name
- **Real-time voting** via WebSockets (Socket.IO)
- **Stateless** – identity via JWT, no database, no persistence
- **Card sets** – Fibonacci, T-Shirt, Powers of 2, Free Input (changeable anytime)
- **Moderator controls** – reveal, reset, topic, timer, card set, role transfer
- **Settings** (mod only):
  - Allow custom input alongside preset deck
  - Auto-reveal when all voters have voted
  - Allow/lock vote changes after submitting

## Quick Start (Docker)

```bash
docker compose up --build
```

App is available at [http://localhost:3000](http://localhost:3000).

## Local Development

```bash
npm install
npm run dev
```

Requires Node.js 20+. Uses `.env.local` for `JWT_SECRET` (auto-created on first run, or set manually).

## Environment Variables

| Variable     | Default              | Description                                        |
| ------------ | -------------------- | -------------------------------------------------- |
| `JWT_SECRET` | `dev-local-secret-…` | Secret for signing JWTs — **change in production** |
| `PORT`       | `3000`               | HTTP port                                          |

## Architecture

```
Browser  ──WebSocket──▶  server.ts (Socket.IO + Next.js)
                              │
                         lib/roomStore.ts  (in-memory Map)
                         lib/jwt.ts        (sign / verify)
```

- **Server**: single `tsx server.ts` process — Next.js + Socket.IO on the same port
- **State**: in-memory only; rooms auto-recreate from JWT on server restart
- **Auth**: JWT stored in `localStorage` per room (`pp_token_<roomId>`), 24h TTL

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · Socket.IO · Zustand · JWT · Docker
