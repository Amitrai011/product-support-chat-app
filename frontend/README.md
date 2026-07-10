# Luxe Support — Frontend (Next.js)

The customer and agent experience for the real-time product support chat, built
with Next.js 16 (App Router, React 19), Tailwind CSS 4, and `socket.io-client`.
See the [root README](../README.md) for the full picture.

## Quick start

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev                  # http://localhost:3000
```

> The backend must be running (default `http://localhost:3001`). Its `CORS_ORIGIN`
> must include this app's origin (`http://localhost:3000` by default).

## Routes

| Route        | Who       | Description                                        |
|--------------|-----------|----------------------------------------------------|
| `/login`     | anyone    | Sign in (with demo-account quick-fill)             |
| `/register`  | anyone    | Create a customer or agent account                 |
| `/customer`  | customer  | Product catalogue + floating multi-window chat     |
| `/agent`     | agent     | Concierge inbox: all conversation threads          |
| `/`          | anyone    | Redirects based on auth/role                        |

## Layout

```
app/          # routes (App Router)
components/    # ChatThread, ChatWindow, AppHeader, Avatar, Logo, ProductImage
lib/          # api client, auth-context, socket singleton, useSocket, types, format
```

## Environment

| Variable              | Default                   | Description                    |
|-----------------------|---------------------------|--------------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001`   | Backend base URL (REST + WS)   |
