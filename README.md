# 🧳 CoBook — Multiplayer Travel Booking

> A **Chrome extension** + companion **website** that turns single-player travel booking sites (Airbnb, MakeMyTrip, Agoda, …) into **live multiplayer sessions** with **automatic expense splitting**.

See [`prd.md`](./prd.md) for the full product requirements document and [`project-documentation.md`](./project-documentation.md) for system design notes.

---

## 💡 The Idea

Group travel planning is painful — links get lost in group chats, dates collide, and one person ends up fronting ₹50,000+ on their credit card hoping friends pay them back.

**CoBook** solves this by:
1. Letting you **start a session** from any supported booking site via the extension.
2. **Syncing** the viewed property + an upvote/downvote board across all members in real-time.
3. **Hijacking checkout** to fractionalize the total cost across all session members and generate instant payment requests (UPI / Venmo / CashApp).

The product cannot be used solo — every session forces invites, creating a built-in viral loop (target K-Factor > 1.2).

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Extension UI | React 18 + Vite + Tailwind CSS |
| Real-time backend | **Supabase Realtime** (Postgres + WebSocket) |
| Expense ledger | PostgreSQL `NUMERIC(10,2)` to avoid float errors |
| DOM parsing | JSON-based adapter schema (server-updateable, no Chrome re-review) |
| Hosting (web) | Vercel |
| Extension | Chrome MV3-compatible structure |

---

## 🗂️ Repo Layout

```
.
├── extension/                 # Chrome extension (the product itself)
│   ├── manifest.json
│   ├── popup.html / popup.jsx
│   └── src/
│       ├── content.jsx        # Injected on supported booking sites
│       ├── background.js      # MV3 service worker
│       ├── supabaseClient.js
│       ├── hooks/
│       │   ├── useSessionSync.js
│       │   └── usePaymentSync.js
│       ├── screens/           # Onboarding, Lobby, Payment, Success, …
│       └── utils/
│           ├── auth.js
│           └── scraper.js     # Adapter-driven DOM extraction
│
├── website/                   # Marketing / install / privacy site
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── pages/PrivacyPolicy.tsx
│       └── main.tsx
│
├── supabase_schema.sql        # Postgres schema
├── platform_adapters.sql      # Booking-site adapter definitions
├── prd.md                     # Product requirements doc
├── project-documentation.md   # Architecture deep-dive
└── CHANGES.md                 # Change log
```

---

## 🚀 Running Locally

### Extension

```bash
cd extension
npm install
npm run dev      # for the popup UI
# Then load the built `dist/` as an unpacked extension at chrome://extensions
```

### Website

```bash
cd website
npm install
npm run dev      # Vite dev server (default :5173)
```

### Backend

- Apply `supabase_schema.sql` to a fresh Supabase project.
- Optionally apply `platform_adapters.sql` and seed adapter rows.

---

## 💰 Monetization (from PRD)

| Stream | Mechanism |
|---|---|
| Affiliate routing | Final checkout URL passes through an affiliate network (1–5% on high-ticket bookings) |
| Convenience fee | Flat $2 / ₹50 micro-fee for auto payment routing |

---

## 📊 KPIs

- **K-Factor** must exceed **1.2**
- **Session-to-checkout rate**
- **Adapter failure rate** (DOM scraper misses) — monitored via Sentry

---

## 📚 Docs

- [`prd.md`](./prd.md) — full PRD (problem, audience, MVP, monetization, KPIs)
- [`project-documentation.md`](./project-documentation.md) — architecture + design choices
- [`CHANGES.md`](./CHANGES.md) — change log

---

## 🤝 Contributing

This is currently a solo-founder project. Issues + PRs are welcome — please read `prd.md` first to stay aligned with the MVP scope (Airbnb + MakeMyTrip only, v1).

---

## 📄 License

[MIT](./LICENSE) — © 2026 Pranav Gawas