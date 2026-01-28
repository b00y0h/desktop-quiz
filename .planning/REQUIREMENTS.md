# Requirements — Desk Quiz App

## Milestone v1.2: Postgres Migration

### Database Setup (DB)
- [x] **DB-01**: Vercel Postgres database provisioned and connected
- [x] **DB-02**: Drizzle ORM configured with type-safe schema
- [x] **DB-03**: Database schema defines quizzes, questions, participants, answers, submissions tables

### Store Rewrite (STORE)
- [x] **STORE-01**: Store layer uses Postgres instead of Blob JSON for all quiz data
- [x] **STORE-02**: All existing store methods maintain same interface (API routes unchanged)
- [x] **STORE-03**: Image URLs continue pointing to Vercel Blob (no image migration)

### Data Migration (MIG)
- [x] **MIG-01**: Migration script reads all existing Blob JSON quizzes
- [x] **MIG-02**: Migration script writes quiz data to Postgres preserving all fields
- [x] **MIG-03**: Migration handles image URL references correctly

### Verification (VER)
- [x] **VER-01**: All existing quiz functionality works after migration
- [x] **VER-02**: No CDN stale read issues (direct database queries)

---

## Validated Requirements (Previous Milestones)

### v1.1: Submission-Based Quiz Flow
All 14 requirements complete — see [milestone archive](milestones/v1.1-ROADMAP.md)

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| DB-01 | 5 | Complete |
| DB-02 | 5 | Complete |
| DB-03 | 5 | Complete |
| STORE-01 | 6 | Complete |
| STORE-02 | 6 | Complete |
| STORE-03 | 6 | Complete |
| MIG-01 | 7 | Complete |
| MIG-02 | 7 | Complete |
| MIG-03 | 7 | Complete |
| VER-01 | 7 | Complete |
| VER-02 | 7 | Complete |
