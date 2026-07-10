# Luxe Support — Real-Time Product Support Chat

A real-time, product-scoped support chat for a luxury catalogue. Customers browse
products and open a **separate live conversation per product**; support agents work
a single inbox showing **every** customer conversation as its own thread.

- **Frontend:** Next.js 16 (App Router, React 19) + Tailwind CSS 4
- **Backend:** NestJS 11 + Socket.IO (WebSockets)
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** JWT (email/password) with `customer` and `agent` roles

---

## Live deployment

**🔗 Live app: https://amit-luxe.duckdns.org**

The whole stack is hosted on **AWS** (region `ap-south-1`, Mumbai):

| Layer                   | What runs                                  | Where it's deployed                                                                                                 |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Frontend**            | Next.js (`next start`, port 3000)          | **AWS EC2** (`t2.micro`, Amazon Linux 2023), managed by **PM2** (`luxe-web`)                                        |
| **Backend + Socket.IO** | NestJS API + WebSocket gateway (port 3001) | **Same EC2 instance**, managed by **PM2** (`luxe-api`)                                                              |
| **Database**            | PostgreSQL                                 | **AWS RDS** (`db.t4g.micro`, PostgreSQL)                                                                            |
| **Reverse proxy / TLS** | Nginx                                      | On the EC2 instance — routes `/` → frontend, `/api` + `/socket.io` → backend; HTTPS via **Let's Encrypt (Certbot)** |
| **DNS**                 | `amit-luxe.duckdns.org` → EC2 Elastic IP   | DuckDNS A record                                                                                                    |

Traffic flow: **browser → `https://amit-luxe.duckdns.org` (Nginx/TLS on EC2) → Next.js (`:3000`) for pages and NestJS (`:3001`) for `/api` + `/socket.io` → RDS PostgreSQL.**

> The backend and the real-time socket are a **single NestJS process** (the Socket.IO gateway is embedded in the API), so "backend" and "socket" deploy together as `luxe-api`.

---

## Features

**Customer** — browse the catalogue; "Chat with Agent" opens a private real-time
thread; **one independent conversation per product**, with several open at once as
dockable floating chat windows; live messages + typing indicators.

**Agent** — a single concierge inbox listing every conversation as a separate
thread (each `(customer, product)` pair → e.g. 10 customers × 2 products = 20
threads); live re-sorting, unread markers, and search; reply in real time.

**Platform** — JWT auth with roles; all messages persisted in PostgreSQL;
WebSocket auth on the handshake + per-conversation authorization on every event.

---

## Setup

**Prerequisites:** Node.js ≥ 20, PostgreSQL ≥ 13 running locally.

```bash
# 1. Database
createdb luxe_support

# 2. Backend  → http://localhost:3001 (REST under /api)
cd backend
npm install
cp .env.example .env      # set DATABASE_URL / JWT_SECRET
npm run db:push           # create tables from the Drizzle schema
npm run db:seed           # seed luxury products + demo accounts
npm run start:dev

# 3. Frontend → http://localhost:3000
cd ../frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```

Open **http://localhost:3000** and sign in (the login page has one-click
quick-fill). Ports: frontend `3000`, backend `3001`; the backend's allowed
origin is `CORS_ORIGIN` in `backend/.env` (defaults to `http://localhost:3000`).

### Demo accounts (password `password123`)

| Role     | Email                | Name               |
| -------- | -------------------- | ------------------ |
| Agent    | `agent@luxe.com`     | Isabella (Support) |
| Agent    | `agent2@luxe.com`    | Marcus (Support)   |
| Customer | `customer@luxe.com`  | Olivia Chen        |
| Customer | `customer2@luxe.com` | James Whitmore     |

> **Try it:** open a customer in one window and an agent in another (incognito).
> Start chats about two products — the agent sees two separate threads and
> messages flow instantly both ways.

---

## Architecture

```
Next.js 16 (React 19)                 NestJS 11
  /login /register                      REST  /api/auth /api/products
  /customer (grid + chat windows)  ──►        /api/conversations
  /agent    (inbox + thread)       (JWT)
  socket.io-client  ◄────────────►  ChatGateway (Socket.IO)
                                    rooms: conversation:<id> · agents · user:<id>
                                          │  Drizzle ORM
                                          ▼
                                     PostgreSQL
                              users · products · conversations · messages
```

**Two channels, one source of truth.** REST handles request/response work (auth,
products, opening a conversation, loading history). Socket.IO handles the live
stream (sending/receiving messages, typing). Every message is written to
PostgreSQL **before** it is broadcast, so the DB is authoritative and late
joiners get full history over REST (**persist-then-broadcast**).

**Rooms model the fan-out** (no manual socket bookkeeping):

- `conversation:<id>` — everyone viewing a thread → `message:new`.
- `agents` — every connected agent → `conversation:updated` (inbox re-sorts /
  previews update without a refetch, incl. brand-new conversations).
- `user:<id>` — a customer's personal room, so their windows update across all
  their threads even when one isn't focused.

**Auth & authorization.** HTTP uses `JwtAuthGuard` + `RolesGuard`/`@Roles()`.
The gateway verifies the handshake JWT **once** on connect and caches the
principal per socket; every sensitive event (`conversation:join`,
`message:send`) re-checks access via `ConversationsService`. Customers can only
touch their own threads; agents can access all.

**Conversation isolation (the core requirement).** A
`UNIQUE(product_id, customer_id)` constraint guarantees exactly one thread per
(customer, product). "Open chat" uses `INSERT … ON CONFLICT DO NOTHING` then
reads the row back, making it idempotent and race-safe.

**Scaling.** Rooms make horizontal scale a config change — add the Socket.IO
**Redis adapter** so broadcasts reach clients on other instances; no app-logic
changes. The DB is authoritative and events are stateless, so reconnects just
re-join rooms and re-fetch history.

---

## Database design

Four tables; the design centres on `conversations` and its uniqueness constraint.

```
users                          products
─────                          ────────
id            uuid PK          id           uuid PK
email         text UNIQUE      name         text
password_hash text             tagline      text
name          text             description  text
role          enum(customer|agent)   price_cents  int
created_at    timestamptz      currency     text
                               image_url    text
                               category     text
                               created_at   timestamptz

conversations                              messages
─────────────                              ────────
id              uuid PK                     id              uuid PK
product_id      uuid FK → products.id       conversation_id uuid FK → conversations.id
customer_id     uuid FK → users.id          sender_id       uuid FK → users.id
created_at      timestamptz                 sender_role     enum(customer|agent)
last_message_at timestamptz                 content         text
UNIQUE(product_id, customer_id)             created_at      timestamptz
```

- `users (1)──<(N) conversations`, `products (1)──<(N) conversations`,
  `conversations (1)──<(N) messages`, `users (1)──<(N) messages`.
- **UUID** primary keys (safe to expose); **enums** for roles; **integer cents**
  for money (exact arithmetic); `last_message_at` is denormalised for O(1) list
  sorting; **cascade deletes** keep dependents clean.
- `sender_role` is denormalised onto `messages` so the UI can label a bubble
  without joining back to `users`.
- Schema in code: [`backend/src/db/schema.ts`](backend/src/db/schema.ts). Manage
  with `npm run db:push` (dev) or `db:generate` (versioned SQL migrations).
- Recommended indexes at scale: `messages(conversation_id, created_at)`,
  `conversations(customer_id)`, `conversations(last_message_at DESC)`.

---

## API & WebSocket reference

**REST (all under `/api`)**

| Method | Path                          | Auth     | Description                            |
| ------ | ----------------------------- | -------- | -------------------------------------- |
| POST   | `/auth/register`              | –        | Create account (`customer`/`agent`)    |
| POST   | `/auth/login`                 | –        | Log in → `{ accessToken, user }`       |
| GET    | `/auth/me`                    | Bearer   | Current user                           |
| GET    | `/products`                   | Bearer   | List products                          |
| GET    | `/conversations`              | Bearer   | Agent: all threads; Customer: own only |
| POST   | `/conversations`              | Customer | Open/resume a thread `{ productId }`   |
| GET    | `/conversations/:id`          | Bearer\* | One conversation                       |
| GET    | `/conversations/:id/messages` | Bearer\* | Message history (oldest→newest)        |

\* Customers are restricted to their own conversations; agents may access any.

**WebSocket (Socket.IO, JWT in handshake `auth.token`)**

| Dir   | Event                  | Payload                                            |
| ----- | ---------------------- | -------------------------------------------------- |
| C → S | `conversation:join`    | `{ conversationId }`                               |
| C → S | `conversation:leave`   | `{ conversationId }`                               |
| C → S | `message:send`         | `{ conversationId, content }`                      |
| C → S | `typing`               | `{ conversationId, isTyping }`                     |
| S → C | `message:new`          | full `Message` (with sender)                       |
| S → C | `conversation:updated` | conversation summary (with last message)           |
| S → C | `typing`               | `{ conversationId, userId, name, role, isTyping }` |

---

## Design decisions (why)

- **PostgreSQL + Drizzle** — a fully-typed, code-first schema that doubles as
  documentation, with lightweight `drizzle-kit` migrations (no codegen step).
- **DB-enforced one-thread-per-(customer, product)** — the isolation requirement
  is an invariant, not app logic; idempotent + race-safe via `onConflictDoNothing`.
- **Socket.IO rooms** over manual socket tracking — precise fan-out that scales
  to a Redis adapter unchanged.
- **Persist-then-broadcast** — the DB is the single source of truth.
- **Auth once at the handshake** — cheap, authenticated events thereafter, with
  per-conversation checks still enforced.
- **Server-echo messaging (no optimistic UI)** — the client view always matches
  persisted state (IDs, timestamps, ordering).

---

## Project structure

```
backend/                     # NestJS 11 API + Socket.IO gateway
  src/
    db/          # Drizzle schema, DB module (DRIZZLE provider), seed
    auth/        # JWT auth, guards (JwtAuthGuard, RolesGuard), decorators
    products/    # Product catalogue
    chat/        # Conversations service/controller + ChatGateway (Socket.IO)
    main.ts      # CORS, global validation, bootstrap
frontend/                    # Next.js 16 App Router
  app/           # /, /login, /register, /customer, /agent
  components/    # ChatThread, ChatWindow, AppHeader, Avatar, Logo, ProductImage
  lib/           # api client, auth-context, socket singleton, useSocket, types
```
