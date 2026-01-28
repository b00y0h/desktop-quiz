# Desk Quiz App

## What This Is

A fun workplace quiz app where coworkers guess whose desk belongs to whom. Workers submit photos of their desks via a special link, then everyone takes a quiz trying to match desks to people.

## Core Value

**Make it dead simple for a group to create and play a "guess the desk" quiz** — the admin creates a quiz, shares a submission link, workers upload their desk photos, admin closes submissions, and the quiz auto-generates for everyone to play.

## Current State

**Shipped: v1.1 — Submission-Based Quiz Flow**

The app supports the full quiz lifecycle:
1. Admin creates quiz and generates a unique submission link
2. Workers visit the link, enter name, upload desk photo (with duplicate detection)
3. Admin previews submissions in a gallery, then closes submissions
4. Questions auto-generate (one per submission, 4-5 randomized name choices)
5. Players take the quiz and see scored results with leaderboard

## Current Milestone: v1.2 — Postgres Migration

**Goal:** Migrate quiz data storage from Vercel Blob JSON files to Vercel Postgres for improved performance and reliability, while keeping image uploads on Vercel Blob.

**Target changes:**
- Replace JSON blob storage with Postgres database
- Eliminate CDN caching issues causing stale reads
- Maintain all existing user-facing functionality
- Keep image storage on Vercel Blob (no change)

## Architecture

Single-tier Next.js app with Vercel Blob storage. No database. See `.planning/codebase/ARCHITECTURE.md` for details.

## Constraints

- Vercel Blob as sole persistence (no database)
- No user accounts — PIN-based admin auth only
- Client-rendered React (no SSR)

---
*Last updated: 2026-01-28 — Milestone v1.2 started*
