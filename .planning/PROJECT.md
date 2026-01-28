# Desk Quiz App

## What This Is

A fun workplace quiz app where coworkers guess whose desk belongs to whom. Workers submit photos of their desks via a special link, then everyone takes a quiz trying to match desks to people.

## Core Value

**Make it dead simple for a group to create and play a "guess the desk" quiz** — the admin creates a quiz, shares a submission link, workers upload their desk photos, admin closes submissions, and the quiz auto-generates for everyone to play.

## Current State

**Shipped: v1.3 — Super Admin Dashboard**

The app supports the full quiz lifecycle with Postgres-backed data storage plus super admin dashboard:
1. Admin creates quiz and generates a unique submission link
2. Workers visit the link, enter name, upload desk photo (with duplicate detection)
3. Admin previews submissions in a gallery, then closes submissions
4. Questions auto-generate (one per submission, 4-5 randomized name choices)
5. Players take the quiz and see scored results with leaderboard
6. Super admin can view all quizzes system-wide and delete any quiz with cascade

**Technical stack:**
- Next.js 14 with App Router
- Vercel Postgres with Drizzle ORM (quiz data)
- Vercel Blob (images only)
- ~2,150 LOC TypeScript

## Requirements

### Validated

**v1.3 — Super Admin Dashboard:**
- ✓ AUTH-01: Super admin access via master PIN — v1.3
- ✓ AUTH-02: Invalid PIN shows error without revealing dashboard — v1.3
- ✓ AUTH-03: Session persists across navigation — v1.3
- ✓ LIST-01: Dashboard displays all quizzes — v1.3
- ✓ LIST-02: Shows title, code, status, date — v1.3
- ✓ LIST-03: Shows submission count — v1.3
- ✓ LIST-04: Shows participant count — v1.3
- ✓ MGMT-01: Navigate to quiz detail view — v1.3
- ✓ MGMT-02: Delete any quiz (bypasses quiz PIN) — v1.3
- ✓ MGMT-03: Delete confirmation required — v1.3
- ✓ MGMT-04: Quiz deletion cascades to Blob images — v1.3

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

(No active requirements — milestone v1.3 complete, next milestone planning required)

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
| Master PIN in env var | Simple auth without user accounts | ✓ Good |
| httpOnly cookies for sessions | Secure session management | ✓ Good |
| Layout-level auth guard | All super-admin routes protected | ✓ Good |
| Simple hash for session token | Sufficient for cookie matching | ✓ Good |

## Context

Shipped v1.3 with super admin dashboard feature:
- Super admin access: /super-admin with SUPER_ADMIN_PIN env var
- Features: View all quizzes with stats, navigate to quiz admin, delete with confirmation
- Security: httpOnly session cookies, 24h expiration, 503 when not configured
- Tech debt: N+1 query pattern (acceptable for admin use), no automated tests

---
*Last updated: 2026-01-28 after v1.3 milestone*
