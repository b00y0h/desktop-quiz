# Architecture

## Overview
Single-tier Next.js application with Vercel Blob as the persistence layer. No separate backend or database server.

## Component Diagram

```
Browser (React Client Components)
    ↓ fetch()
Next.js API Routes (/api/*)
    ↓ @vercel/blob SDK
Vercel Blob Storage (JSON + images)
```

## Data Model
Single entity: **Quiz** (stored as JSON blob)
- Contains embedded `Question[]` and `Participant[]` arrays
- No relational structure — all data for a quiz in one blob
- Read-modify-write pattern (load full quiz, mutate, save back)

## Page Architecture (App Router)

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Client | Landing page with create/join links |
| `/create` | Client | Quiz creation form (title, description, PIN) |
| `/play` | Client | Join quiz by 6-char code |
| `/play/[code]` | Client | Play quiz (name entry → questions → results) |
| `/admin/[id]` | Client | Admin dashboard (PIN-protected, manage questions) |
| `/admin/[id]/results` | Client | Live results dashboard (auto-refresh 5s) |

All pages are `'use client'` — no server-side rendering used.

## Data Flow

### Quiz Creation
1. User enters title + PIN → POST `/api/quiz` → creates Quiz blob → redirects to admin

### Adding Questions
1. Admin uploads image → POST `/api/upload` → stores in Blob → returns URL
2. Admin submits question → POST `/api/quiz/[id]/questions` → appends to Quiz blob

### Playing Quiz
1. Player enters code → GET `/api/quiz/code/[code]` → returns quiz with shuffled names (answers stripped)
2. Player answers all questions → POST `/api/quiz/[id]/submit` → scores and saves participant
3. Results shown with leaderboard from GET `/api/quiz/[id]/results`

## Key Design Decisions
- **Optimistic UI updates** with delayed server reconciliation (2s timeout)
- **No SSR** — all pages are client-rendered
- **Blob as database** — simple but has race condition risks on concurrent writes
- **PIN-based auth** — minimal security, stored in sessionStorage
