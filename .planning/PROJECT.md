# Desk Quiz App

## What This Is

A fun workplace quiz app where coworkers guess whose desk belongs to whom. Workers submit photos of their desks via a special link, then everyone takes a quiz trying to match desks to people.

## Core Value

**Make it dead simple for a group to create and play a "guess the desk" quiz** — the admin creates a quiz, shares a submission link, workers upload their desk photos, admin closes submissions, and the quiz auto-generates for everyone to play.

## Current Milestone: v1.1 Submission-Based Quiz Flow

**Goal:** Allow workers to self-submit desk photos via a unique link, then auto-generate quiz questions from those submissions.

**Target features:**
- Admin creates a submission link for a quiz
- Workers visit the link, enter their name, upload a desk photo
- Admin closes submissions from the dashboard
- Quiz questions auto-generate from submissions (4-5 multiple choice names per question)
- Enforced quiz states: collecting → closed → playable

## Requirements

### Validated

- ✓ Admin can create a quiz with title, description, and PIN — existing
- ✓ Admin can manually add questions with uploaded images — existing
- ✓ Players can join a quiz by 6-character code — existing
- ✓ Players answer questions and see scored results with leaderboard — existing
- ✓ Admin can view live results dashboard — existing
- ✓ Names from previous submissions are filtered from answer options — existing
- ✓ Players can retake quiz (overwrites previous submission) — existing

### Active

- [ ] Admin can generate a unique submission link for a quiz
- [ ] Workers can visit submission link, enter name, upload desk photo
- [ ] Admin can close submissions from the admin dashboard
- [ ] Quiz questions auto-generate from submissions (subset of 4-5 name choices)
- [ ] Quiz enforces states: collecting submissions → closed → playable
- [ ] Existing manual question creation flow still works alongside submission flow

### Out of Scope

- Automatic closing (deadlines/thresholds) — keep it simple, admin button only
- OAuth or user accounts — stay with current PIN-based admin auth
- Real-time submission notifications — admin can refresh to see new submissions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Auto-generate questions from submissions | Eliminates admin manual work | — Pending |
| Separate submission link (not reuse quiz code) | Clearer separation of concerns | — Pending |
| Enforced quiz states | Prevents playing before submissions close | — Pending |
| 4-5 name subset for answer choices | Better UX than showing all names | — Pending |
| Keep both manual and submission flows | Flexibility for different use cases | — Pending |

## Architecture

Single-tier Next.js app with Vercel Blob storage. No database. See `.planning/codebase/ARCHITECTURE.md` for details.

## Constraints

- Vercel Blob as sole persistence (no database)
- No user accounts — PIN-based admin auth only
- Client-rendered React (no SSR)

---
*Last updated: 2026-01-27 after initialization*
