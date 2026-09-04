# Job Console — Honest Job Matching & CV Tailoring

> An intelligent, AI-powered job search console that scans real postings from multiple ATS boards and job APIs, evaluates each against your CV across 5 structured dimensions with transparent scoring rules, and gives you actionable match reports, truthful CV tailoring, and Kanban tracking.

---

## 🎯 Philosophy: Recommend, Never Impersonate

**The system evaluates and recommends. You decide and act.**  
Job Console does not auto-submit spam applications or send unsolicited emails on your behalf. Instead, it:
- Surfaces verified direct apply links.
- Evaluates fit objectively with clear mathematical reasoning and hard skill caps.
- Tailors your CV bullets to highlight real experience without hallucinating fake skills.
- Generates polite, concise follow-up email drafts ready for you to copy and send.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 📡 **Multi-Source Aggregation** | Pulls live postings across **Greenhouse**, **Lever**, **Ashby**, **RemoteOK**, **WeWorkRemotely RSS**, and optional metered APIs (**Adzuna**, **JSearch**). |
| 🛡️ **Deduplication & Pre-Filter** | Corporate suffix stripping, remote detection, freshness windows, and client-side preference filtering prevent duplicate or irrelevant roles. |
| 🎯 **Transparent Match Scoring** | 0–100 match score computed from 5 weighted dimensions (Role Fit, Skills Evidence, Depth/Scale, Industry/Domain, Logistics) with deterministic hard caps. |
| 📊 **Deep Match Reports** | Breakdown of evidenced skills, requirement checklist, key strengths, potential gaps, actionable CV improvement tips, and a posting legitimacy analysis. |
| ✍️ **CV Tailor Studio** | Requirement-cited resume bullet points rewritten specifically for each job’s job description without fabricating experience. |
| 📋 **Application Kanban Tracker** | 9-stage Kanban pipeline with days-in-status tracking, transition history logging, and 1-click follow-up email draft generator (150 words max). |

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Database**: [PostgreSQL (Neon)](https://neon.tech/) + [Prisma ORM 6](https://www.prisma.io/)
- **AI Models**: [Google Gemini 2.5 Flash](https://aistudio.google.com/) *(default)* / [Anthropic Claude Sonnet 5](https://anthropic.com/) *(fallback)*
- **Background Tasks**: [Trigger.dev v4](https://trigger.dev/) (Async task execution & scan orchestration)
- **Scraping**: [Playwright](https://playwright.dev/) & RSS / HTTP adapters

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: `20.x` or higher
- **Package Manager**: `npm` (or `pnpm` / `yarn`)
- **Accounts (Free Tier)**:
  - [Neon](https://neon.tech) (Serverless PostgreSQL)
  - [Clerk](https://clerk.com) (User Authentication)
  - [Trigger.dev](https://cloud.trigger.dev) (Background task execution)
  - [Google AI Studio](https://aistudio.google.com) *or* [Anthropic](https://console.anthropic.com) (AI evaluation)

---

### 2. Clone & Install

```bash
git clone https://github.com/devang0426/workspace.git
cd workspace
npm install
```

---

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required variables inside `.env.local`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# AI Provider (at least one is required)
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
# ANTHROPIC_API_KEY=sk-ant-...

# Neon PostgreSQL (Pooled for app, Direct for migrations)
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Trigger.dev Background Jobs
TRIGGER_SECRET_KEY=tr_dev_...

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> 💡 **Important Database Note**: Neon provides two connection strings. `DATABASE_URL` **must** be the pooled connection (containing `-pooler`). `DIRECT_URL` is the unpooled direct connection used for Prisma migrations.

---

### 4. Initialize Database & Seed

```bash
# Push database schema & migrations to Neon
npm run db:deploy

# (Optional) Seed initial demo jobs and preference defaults
npm run seed
```

---

### 5. Start the Development Servers

You will need **two terminal tabs**:

#### Terminal 1: Web Application
```bash
npm run dev
```

#### Terminal 2: Trigger.dev Background Worker
```bash
npx trigger.dev@latest dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Codebase & Folder Structure

```text
├── app/                      # Next.js App Router
│   ├── (console)/            # Authenticated Console routes (Feed, Tracker, Scans, Studio, Settings)
│   ├── api/                  # REST API endpoints (Jobs, Matches, Scans, Applications, Webhooks)
│   ├── onboarding/           # New user CV upload & preference onboarding flow
│   ├── sign-in/ & sign-up/   # Clerk authentication catch-all pages
│   ├── globals.css           # Tailwind v4 theme palette & typography design tokens
│   └── page.tsx              # Public landing page & feature showcase
├── components/               # React components grouped by feature area
│   ├── feed/                 # Scored job feed table, filters, and row cards
│   ├── report/               # Match report, radar bars, requirement map, CV tips
│   ├── tracker/              # Kanban board, columns, drag-and-drop cards, history timeline
│   ├── editor/               # Resume upload dropzone & preference controls
│   ├── meter/                # 10-segment score meter component
│   └── ui/                   # Reusable atomic UI primitives (Button, Modal, StatusChip, Field)
├── lib/                      # Core business logic & domain services
│   ├── ai/                   # AI prompt specifications, schemas, cost calculation, and client fallback
│   ├── db/                   # Prisma database queries and repository functions
│   ├── evaluation/           # 0–100 deterministic scoring engine & boundary cap rules
│   ├── sources/              # ATS adapters (Greenhouse, Lever, Ashby), RSS parser, and deduplicator
│   └── tracker/              # Canonical application status machine & transitions
├── prisma/                   # Database schema, migration SQL files, and seed script
├── trigger/                  # Trigger.dev task handlers (Scan, Scrape, Evaluate, Tailor, Follow-up)
└── context/                  # Architectural specs, prompt designs, and data contracts
```

---

## 🧪 Available Scripts

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server on `http://localhost:3000` |
| `npm run build` | Builds the production bundle with typechecking |
| `npm run start` | Runs the built production server locally |
| `npm run lint` | Runs ESLint across the codebase |
| `npm test` | Runs the full unit test suite (62 tests across dedupe, scoring, prompts, filters) |
| `npm run db:deploy` | Applies pending Prisma migrations to the database |
| `npm run db:migrate` | Generates and applies a new migration in development |
| `npm run db:studio` | Opens Prisma Studio visual database GUI |
| `npm run seed` | Runs idempotent database seed script |

---

## 🚢 Production Deployment

### 1. Deploy Frontend on Vercel
1. Import your GitHub repository to [Vercel](https://vercel.com).
2. Set the Environment Variables listed in `.env.example`.
3. Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://your-domain.vercel.app`).

### 2. Deploy Background Workers on Trigger.dev
Run the deployment command from your workspace:
```bash
npx trigger.dev@latest deploy
```
In your [Trigger.dev Dashboard](https://cloud.trigger.dev), add your production `DATABASE_URL`, `DIRECT_URL`, and AI keys under **Project Settings → Environment Variables**.

### 3. Configure Clerk Webhook
In [Clerk Dashboard](https://dashboard.clerk.com) under **Webhooks**:
- **Endpoint URL**: `https://your-domain.vercel.app/api/webhooks/clerk`
- **Subscribed Events**: `user.created`, `user.updated`, `user.deleted`
- Copy the **Signing Secret** into your Vercel `CLERK_WEBHOOK_SIGNING_SECRET`.

---

## 📜 Invariants & Core Design Rules

1. **Deterministic Scoring**: The AI never returns a raw single score. It returns scores for 5 individual dimensions, and application code in `lib/evaluation/score.ts` calculates the weighted score and applies hard cap penalties.
2. **First-Seen Provenance**: When a job appears across multiple scans or sources, the original `firstSeenAt` and `source` are preserved for accurate tracking.
3. **No Phantom Experience**: Tailored CV bullets and follow-up emails only use experience present in your active resume profile.

---

## 📄 License

MIT License. Designed and built with clean engineering standards.
