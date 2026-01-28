# Desk Quiz App

## What This Is

A fun workplace quiz app where coworkers guess whose desk belongs to whom. Workers submit photos of their desks via a special link, then everyone takes a quiz trying to match desks to people.

## Core Value

**Make it dead simple for a group to create and play a "guess the desk" quiz** — the admin creates a quiz, shares a submission link, workers upload their desk photos, admin closes submissions, and the quiz auto-generates for everyone to play.

## Current State

**Shipped: v1.2 — Postgres Migration**

The app supports the full quiz lifecycle with Postgres-backed data storage:
1. Admin creates quiz and generates a unique submission link
2. Workers visit the link, enter name, upload desk photo (with duplicate detection)
3. Admin previews submissions in a gallery, then closes submissions
4. Questions auto-generate (one per submission, 4-5 randomized name choices)
5. Players take the quiz and see scored results with leaderboard

**Technical stack:**
- Next.js 14 with App Router
- Vercel Postgres with Drizzle ORM (quiz data)
- Vercel Blob (images only)
- ~1,590 LOC TypeScript for database layer

## Requirements

### Validated

**v1.2 — Postgres Migration:**
- ✓ DB-01: Vercel Postgres database provisioned and connected — v1.2
- ✓ DB-02: Drizzle ORM configured with type-safe schema — v1.2
- ✓ DB-03: Database schema defines all 5 tables — v1.2
- ✓ STORE-01: Store layer uses Postgres instead of Blob JSON — v1.2
- ✓ STORE-02: All store methods maintain same interface — v1.2
- ✓ STORE-03: Image URLs continue pointing to Vercel Blob — v1.2
- ✓ MIG-01: Migration script reads existing Blob JSON quizzes — v1.2
- ✓ MIG-02: Migration script writes quiz data to Postgres — v1.2
- ✓ MIG-03: Migration handles image URL references — v1.2
- ✓ VER-01: All existing quiz functionality works after migration — v1.2
- ✓ VER-02: No CDN stale read issues — v1.2

**v1.1 — Submission-Based Quiz Flow:**
- ✓ SUB-01 through GEN-03 (14 requirements) — v1.1 (see milestones/v1.1-ROADMAP.md)

### Active

(None — awaiting next milestone planning)

### Out of Scope

- Mobile app — web-first approach, responsive design sufficient
- User accounts — PIN-based admin auth keeps it simple
- Real-time updates — polling/refresh sufficient for quiz use case
- Offline mode — requires network for submission/play

## Architecture

Single-tier Next.js app with hybrid storage:
- **Postgres** (via Drizzle ORM): Quiz metadata, questions, participants, answers, submissions
- **Vercel Blob**: Images only (desk photos)

See `.planning/codebase/ARCHITECTURE.md` for details.

## Constraints

- No user accounts — PIN-based admin auth only
- Client-rendered React (no SSR)
- Images on Vercel Blob, data in Vercel Postgres

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Drizzle ORM over raw SQL | Type safety, relational queries | ✓ Good |
| Keep images in Blob | Large binary data, CDN delivery | ✓ Good |
| Idempotent migration | Safe re-runs, no data loss | ✓ Good |
| Cascade deletes in schema | Clean quiz deletion | ✓ Good |
| Preserve store interface | Zero API changes needed | ✓ Good |

---
*Last updated: 2026-01-28 — Milestone v1.2 complete*
