# Roadmap — Desk Quiz App

## Completed Milestones

- **v1.1: Submission-Based Quiz Flow** — 4 phases, 14 requirements, 45 commits ([archive](milestones/v1.1-ROADMAP.md))

---

## Current Milestone: v1.2 — Postgres Migration

**Goal:** Migrate quiz data storage from Vercel Blob JSON to Vercel Postgres for improved performance and reliability.

### Phase 5: Database Foundation ✓
**Goal:** Set up Vercel Postgres database with Drizzle ORM and define the schema
**Requirements:** DB-01, DB-02, DB-03
**Status:** Complete
**Success criteria:**
1. ✓ Vercel Postgres database created and environment variables configured
2. ✓ Drizzle ORM installed and configured with database connection
3. ✓ Schema file defines all tables (quizzes, questions, participants, answers, submissions)
4. ✓ Schema pushed to database successfully

### Phase 6: Store Migration ✓
**Goal:** Rewrite store.ts to use Postgres instead of Blob JSON while maintaining the same interface
**Requirements:** STORE-01, STORE-02, STORE-03
**Status:** Complete
**Success criteria:**
1. ✓ All store methods rewritten to use Drizzle queries
2. ✓ API routes work without modification (same store interface)
3. ✓ Image uploads still use Vercel Blob
4. ✓ Quiz CRUD operations work end-to-end

### Phase 7: Data Migration & Verification ✓
**Goal:** Migrate existing Blob data to Postgres and verify all functionality
**Requirements:** MIG-01, MIG-02, MIG-03, VER-01, VER-02
**Status:** Complete
**Success criteria:**
1. ✓ Migration script successfully reads all Blob JSON quizzes
2. ✓ All quiz data migrated to Postgres with correct relationships
3. ✓ Image URLs preserved and working
4. ✓ Full app functionality verified (create, submit, play, results)

**Post-Migration State:**
- Quiz data now lives in Vercel Postgres (5 tables)
- Images continue to live in Vercel Blob
- Old `quiz-data/*.json` files in Blob can be archived/deleted
- Store layer only uses Blob for image operations

**Benefits Achieved:**
- No more CDN stale read issues (direct DB queries)
- Reduced Blob storage costs (only images, no JSON)
- Support for DB transactions and indexes if needed

---

## Milestone v1.2 Complete

All 11 requirements (DB-01 through VER-02) have been satisfied.

**Summary:**
- Phase 5: Database foundation with Drizzle ORM and Vercel Postgres
- Phase 6: Store layer rewritten to use Postgres with same interface
- Phase 7: Migration script executed, data verified, documentation complete

This milestone can be archived to `milestones/v1.2-ROADMAP.md`.

---

## Requirement Coverage

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| DB-01 | 5 | Vercel Postgres database provisioned and connected |
| DB-02 | 5 | Drizzle ORM configured with type-safe schema |
| DB-03 | 5 | Database schema defines all tables |
| STORE-01 | 6 | Store layer uses Postgres instead of Blob JSON |
| STORE-02 | 6 | All store methods maintain same interface |
| STORE-03 | 6 | Image URLs continue pointing to Vercel Blob |
| MIG-01 | 7 | Migration script reads existing Blob JSON quizzes |
| MIG-02 | 7 | Migration script writes data to Postgres |
| MIG-03 | 7 | Migration handles image URL references |
| VER-01 | 7 | All existing functionality works after migration |
| VER-02 | 7 | No CDN stale read issues |
