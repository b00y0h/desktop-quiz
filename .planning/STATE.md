# Project State — Desk Quiz App

## Project Reference

**Core value:** Make it dead simple for a group to create and play a "guess the desk" quiz.

**Current milestone:** v1.3 — Super Admin Dashboard

**Current focus:** Add master PIN authentication and dashboard to view/delete all quizzes system-wide.

---

## Current Position

**Milestone:** v1.3 — Super Admin Dashboard
**Phase:** 8 — Super Admin Dashboard
**Plan:** 2 of 4 complete
**Status:** In progress
**Last activity:** 2026-01-28 — Completed 08-02-PLAN.md (Dashboard UI)

**Progress:**
```
[████████████████████████................................] 50% (2/4 plans)
```

---

## Performance Metrics

**Milestone v1.3:**
- Requirements completed: 8/11 (AUTH-01-03, LIST-01-04, MGMT-01)
- Phases completed: 0/1
- Current phase progress: 50% (2/4 plans)

**Historical velocity:**
- v1.2 (Postgres Migration): 11 requirements, 5 phases, shipped 2026-01-28
- v1.1 (Submission Flow): 14 requirements, 7 phases, shipped 2025-12

---

## Accumulated Context

### Decisions
- Single phase for v1.3 due to small, cohesive scope (11 requirements)
- Leveraging existing store.deleteQuiz for Blob cascade (already implemented)
- Master PIN stored in environment variable (no new auth system)
- Simple hash for session token (djb2-style, not crypto-secure but sufficient for cookie matching)
- Feature disabled when SUPER_ADMIN_PIN not set or < 4 chars (returns 503)
- 24-hour session expiration for admin convenience
- Auth guard in layout.tsx shows login form inline rather than redirect
- Quiz stats fetched via Promise.all for parallel count queries
- View link navigates to existing /admin/[id] page (no new detail page)

### TODOs
- [x] Implement super admin authentication with master PIN (08-01)
- [x] Build dashboard UI with quiz listing and stats (08-02)
- [ ] Add delete functionality with confirmation (08-03)
- [ ] Test Blob cascade through super admin path (08-04)

### Blockers
None at this time.

### Technical Notes
- Store layer already has deleteQuiz with Blob cascade (from v1.2)
- Store now has getAllQuizzesWithStats method for listing with counts
- Session management via httpOnly cookies (verifySuperAdminSession)
- Auth API: POST login, GET check, DELETE logout at /api/super-admin/auth
- Quizzes API: GET /api/super-admin/quizzes returns all quizzes with stats

---

## Session Continuity

**If you're a new Claude taking over this project:**

1. **What we're building:** Super admin dashboard for v1.3
2. **Current state:** Plans 08-01 (auth) and 08-02 (dashboard) complete, plans 08-03 and 08-04 remain
3. **Next action:** Execute 08-03-PLAN.md (Delete Functionality)
4. **Key context:** Dashboard UI exists, need to add delete button and API

**Technical stack:**
- Next.js 14 App Router
- Vercel Postgres + Drizzle ORM (quiz data)
- Vercel Blob (images only)
- Store layer with 17 methods including deleteQuiz and getAllQuizzesWithStats

**Key files from 08-01:**
- `src/lib/super-admin.ts` - Session utilities, verifySuperAdminSession()
- `src/app/api/super-admin/auth/route.ts` - Auth API endpoint

**Key files from 08-02:**
- `src/lib/store.ts` - Added getAllQuizzesWithStats method
- `src/app/api/super-admin/quizzes/route.ts` - GET returns all quizzes
- `src/app/super-admin/layout.tsx` - Auth guard with login form
- `src/app/super-admin/page.tsx` - Dashboard with quiz table

**Previous milestone:** v1.2 shipped with Postgres migration, 5 DB tables, cascade deletes working.

---

*Last updated: 2026-01-28*
