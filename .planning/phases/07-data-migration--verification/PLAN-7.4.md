---
plan: "07.4"
title: "Cleanup and Documentation"
wave: 3
depends_on: ["07.2"]
files_modified:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
autonomous: true
---

# Plan 7.4: Cleanup and Documentation

## Objective
Update project documentation to reflect the completed migration, mark requirements as done, and document any post-migration maintenance considerations.

## must_haves
- [ ] REQUIREMENTS.md updated with all Phase 7 requirements marked complete
- [ ] ROADMAP.md updated to show Phase 7 complete
- [ ] Migration script documented with clear usage instructions
- [ ] Post-migration notes captured for future reference

## Tasks

<task id="1" description="Update REQUIREMENTS.md">
Update `.planning/REQUIREMENTS.md` to mark Phase 7 requirements complete:

Change:
```markdown
### Data Migration (MIG)
- [ ] **MIG-01**: Migration script reads all existing Blob JSON quizzes
- [ ] **MIG-02**: Migration script writes quiz data to Postgres preserving all fields
- [ ] **MIG-03**: Migration handles image URL references correctly

### Verification (VER)
- [ ] **VER-01**: All existing quiz functionality works after migration
- [ ] **VER-02**: No CDN stale read issues (direct database queries)
```

To:
```markdown
### Data Migration (MIG)
- [x] **MIG-01**: Migration script reads all existing Blob JSON quizzes
- [x] **MIG-02**: Migration script writes quiz data to Postgres preserving all fields
- [x] **MIG-03**: Migration handles image URL references correctly

### Verification (VER)
- [x] **VER-01**: All existing quiz functionality works after migration
- [x] **VER-02**: No CDN stale read issues (direct database queries)
```

Also update the traceability table:
```markdown
| MIG-01 | 7 | Complete |
| MIG-02 | 7 | Complete |
| MIG-03 | 7 | Complete |
| VER-01 | 7 | Complete |
| VER-02 | 7 | Complete |
```

And mark STORE requirements from Phase 6 complete if not already done:
```markdown
### Store Rewrite (STORE)
- [x] **STORE-01**: Store layer uses Postgres instead of Blob JSON for all quiz data
- [x] **STORE-02**: All existing store methods maintain same interface (API routes unchanged)
- [x] **STORE-03**: Image URLs continue pointing to Vercel Blob (no image migration)
```
</task>

<task id="2" description="Update ROADMAP.md">
Update `.planning/ROADMAP.md` to mark Phase 7 complete:

Change:
```markdown
### Phase 7: Data Migration & Verification
**Goal:** Migrate existing Blob data to Postgres and verify all functionality
**Requirements:** MIG-01, MIG-02, MIG-03, VER-01, VER-02
**Success criteria:**
1. Migration script successfully reads all Blob JSON quizzes
2. All quiz data migrated to Postgres with correct relationships
3. Image URLs preserved and working
4. Full app functionality verified (create, submit, play, results)
```

To:
```markdown
### Phase 7: Data Migration & Verification ✓
**Goal:** Migrate existing Blob data to Postgres and verify all functionality
**Requirements:** MIG-01, MIG-02, MIG-03, VER-01, VER-02
**Status:** Complete
**Success criteria:**
1. ✓ Migration script successfully reads all Blob JSON quizzes
2. ✓ All quiz data migrated to Postgres with correct relationships
3. ✓ Image URLs preserved and working
4. ✓ Full app functionality verified (create, submit, play, results)
```

If this completes milestone v1.2, add a summary section noting it can be archived.
</task>

<task id="3" description="Add migration script documentation">
Add a comment block or README section documenting the migration script usage:

In `scripts/migrate-blob-to-postgres.ts`, ensure the header comment includes:

```typescript
/**
 * Migration script: Vercel Blob JSON -> Postgres
 *
 * This script migrates quiz data from the legacy Vercel Blob JSON storage
 * to the new Vercel Postgres database using Drizzle ORM.
 *
 * USAGE:
 *   npm run migrate:blob-to-postgres
 *
 * PREREQUISITES:
 *   - BLOB_READ_WRITE_TOKEN environment variable set (Vercel Blob access)
 *   - POSTGRES_URL environment variable set (Vercel Postgres connection)
 *   - Database schema already pushed (npm run db:push)
 *
 * BEHAVIOR:
 *   - Reads all quiz-data/*.json files from Blob storage
 *   - Inserts quiz records and all related data into Postgres
 *   - Preserves all image URLs (images remain in Blob storage)
 *   - Idempotent: safely skips quizzes that already exist in Postgres
 *
 * POST-MIGRATION:
 *   - Verify data with npm run db:studio
 *   - Test app functionality end-to-end
 *   - Old Blob JSON files can be deleted manually after verification
 *
 * NOTES:
 *   - Images are NOT migrated (they remain in Vercel Blob)
 *   - Only quiz data (JSON) is migrated to Postgres
 */
```
</task>

<task id="4" description="Document post-migration considerations">
Create a brief note documenting what happens after migration:

**Post-Migration State:**
- Quiz data now lives in Vercel Postgres (5 tables)
- Images continue to live in Vercel Blob
- Old `quiz-data/*.json` files in Blob can be archived/deleted
- The store.ts now only uses Blob for image operations (`del()` calls)

**Future Considerations:**
- No more CDN stale read issues (direct DB queries)
- Blob storage costs reduced (only images, no JSON)
- Can add indexes for performance if needed
- Can use DB transactions for atomic operations

This information can be captured in:
- The migration script header (done in task 3)
- A brief section in ROADMAP.md under Phase 7
- Or a NOTES.md file in the phase directory
</task>

## Verification

1. **REQUIREMENTS.md updated**: All Phase 7 requirements marked [x]
2. **ROADMAP.md updated**: Phase 7 shows ✓ and complete status
3. **Script documented**: Migration script has clear usage documentation
4. **Traceability complete**: All requirements in traceability table show Complete
