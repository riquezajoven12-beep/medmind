# 🧠 MedMind — AI-Powered Mind Maps for Medicine

> The world's smartest mind mapping platform built for medical education. Powered by Claude AI.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![Stripe](https://img.shields.io/badge/Stripe-Payments-purple)
![Claude AI](https://img.shields.io/badge/Claude-AI-orange)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Next.js 14 (App Router) + React 18 + Tailwind  │
│  Zustand (state) · React Flow (canvas)           │
└──────────┬──────────────────────┬───────────────┘
           │                      │
     ┌─────▼─────┐         ┌─────▼─────┐
     │  Supabase  │         │   Stripe   │
     │  Auth      │         │   Payments │
     │  Database  │         │   Webhooks │
     │  Storage   │         │   Portal   │
     │  RLS       │         └───────────┘
     └─────┬─────┘
           │
     ┌─────▼─────┐
     │ Claude AI  │
     │ Anthropic  │
     │ API        │
     └───────────┘
```

## 📁 Project Structure

```
medmind/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page (public)
│   │   ├── layout.tsx            # Root layout
│   │   ├── login/page.tsx        # Login (email + OAuth)
│   │   ├── signup/page.tsx       # Registration
│   │   ├── dashboard/page.tsx    # Map management hub
│   │   ├── map/[id]/page.tsx     # Mind map editor (core)
│   │   └── api/
│   │       ├── auth/callback/    # OAuth callback
│   │       ├── ai/               # AI endpoint (rate-limited)
│   │       ├── maps/             # CRUD for maps
│   │       └── stripe/
│   │           ├── checkout/     # Create checkout session
│   │           └── webhook/      # Subscription events
│   ├── lib/
│   │   ├── supabase.ts           # Client, server, admin clients
│   │   ├── stripe.ts             # Stripe utilities
│   │   ├── ai.ts                 # Claude AI integration + prompts
│   │   └── store.ts              # Zustand stores
│   ├── types/
│   │   └── index.ts              # All TypeScript types + plan configs
│   └── styles/
│       └── globals.css           # Tailwind + custom styles
├── supabase/
│   └── migrations/
│       └── 001_schema.sql        # Complete database schema
├── middleware.ts                  # Auth route protection
├── .env.example                  # Environment template
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## 🚀 Deployment Guide

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier works)
- A Stripe account
- An Anthropic API key

### Step 1: Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/medmind.git
cd medmind
npm install
```

### Step 2: Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste contents of `supabase/migrations/001_schema.sql` → Run
3. Go to **Authentication → Providers**:
   - Enable **Email** (with email confirmation)
   - Enable **Google** OAuth (add client ID/secret from Google Cloud Console)
   - Enable **GitHub** OAuth (add client ID/secret from GitHub Developer Settings)
4. Go to **Authentication → URL Configuration**:
   - Set Site URL: `https://your-domain.com`
   - Add redirect URLs: `https://your-domain.com/api/auth/callback`
5. Copy your Project URL, Anon Key, and Service Role Key

### Step 3: Stripe Setup

1. Create products in Stripe Dashboard:
   - **Pro Plan**: $12/month and $96/year
   - **Team Plan**: $29/month and $228/year
2. Copy the Price IDs for each
3. Set up a webhook endpoint: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Copy your Webhook Signing Secret

### Step 4: Environment Variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_TEAM_YEARLY=price_...

ANTHROPIC_API_KEY=sk-ant-...

NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 5: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# or via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... (all variables from .env.example)

# Production deploy
vercel --prod
```

### Step 6: Local Development

```bash
# Start dev server
npm run dev

# In another terminal, forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 🔒 Security Layers

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Supabase Auth (email + OAuth) |
| **Authorization** | Row Level Security (RLS) on all tables |
| **API Protection** | Middleware checks auth on all /dashboard, /map routes |
| **Rate Limiting** | AI queries capped per tier per day |
| **Webhook Security** | Stripe signature verification |
| **Data Isolation** | Users can only access their own data |
| **Input Validation** | Zod schemas on API inputs |

## 💰 Subscription Tiers

| Feature | Free | Pro ($12/mo) | Team ($29/mo) |
|---------|------|-------------|---------------|
| Mind Maps | 5 | Unlimited | Unlimited |
| AI Queries/day | 10 | 100 | 500 |
| Storage | 50MB | 5GB | 50GB |
| Export Formats | PNG, JSON | All (PDF, PPTX, DOCX) | All |
| Templates | ✗ | ✓ | ✓ |
| Collaboration | ✗ | ✗ | ✓ |
| Custom Branding | ✗ | ✓ | ✓ |
| Trial | — | 14 days | 14 days |

## 🤖 AI Capabilities

All powered by Claude (Anthropic API):

- **Expand** — Generate subtopics from any node
- **Explain** — Pathophysiology & clinical significance
- **Quiz** — USMLE/PLAB-style MCQs with explanations
- **Mnemonic** — Memory aids for exam preparation
- **Clinical Pearls** — Red flags, differentials, management
- **Differential Diagnosis** — Structured DDx framework
- **Pharmacology** — Drug class, MOA, side effects, interactions
- **Connections** — Cross-topic medical relationships
- **Simplify** — Analogies & ELI5 explanations
- **Full Map Generation** — Complete mind map from a single topic

## 📄 License

MIT © 2026 MedMind
