# Luxe Support — Backend (NestJS)

REST API + Socket.IO gateway for the real-time product support chat, backed by
PostgreSQL via Drizzle ORM. See the [root README](../README.md) for the full
picture and [`docs/`](../docs) for architecture and database notes.

## Quick start

```bash
npm install
cp .env.example .env      # set DATABASE_URL, JWT_SECRET
createdb luxe_support     # if the database doesn't exist yet
npm run db:push           # create tables from src/db/schema.ts
npm run db:seed           # seed products + demo accounts
npm run start:dev         # http://localhost:3001 (REST under /api)
```

## Scripts

| Script                 | Description                                   |
|------------------------|-----------------------------------------------|
| `npm run start:dev`    | Run in watch mode                             |
| `npm run build`        | Compile to `dist/`                            |
| `npm run start:prod`   | Run the compiled build (`node dist/main`)     |
| `npm run db:push`      | Apply the Drizzle schema to the database      |
| `npm run db:generate`  | Generate versioned SQL migrations             |
| `npm run db:seed`      | Seed luxury products + demo accounts          |
| `npm run db:studio`    | Open Drizzle Studio                           |

## Layout

```
src/
├── db/          # Drizzle schema, DB module (DRIZZLE provider), seed
├── auth/        # JWT auth, guards (JwtAuthGuard, RolesGuard), decorators
├── products/    # Product catalogue module
├── chat/        # Conversations service/controller + ChatGateway (Socket.IO)
└── main.ts      # CORS, global validation, bootstrap
```

## Environment

| Variable         | Default                          | Description                        |
|------------------|----------------------------------|------------------------------------|
| `DATABASE_URL`   | `postgresql://…/luxe_support`    | PostgreSQL connection string       |
| `JWT_SECRET`     | `change-me`                      | Secret for signing JWTs            |
| `JWT_EXPIRES_IN` | `7d`                             | Token lifetime                     |
| `PORT`           | `3001`                           | HTTP + WebSocket port              |
| `CORS_ORIGIN`    | `http://localhost:3000`          | Allowed frontend origin(s), comma-separated |
