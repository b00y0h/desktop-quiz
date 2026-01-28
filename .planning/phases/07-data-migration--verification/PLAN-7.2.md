---
plan: "07.2"
title: "Execute Migration and Verify Data Integrity"
wave: 2
depends_on: ["07.1"]
files_modified: []
autonomous: true
---

# Plan 7.2: Execute Migration and Verify Data Integrity

## Objective
Run the migration script to transfer all existing Blob data to Postgres, then verify data integrity by comparing record counts and spot-checking data.

## must_haves
- [ ] Migration script executes successfully without errors (MIG-01, MIG-02)
- [ ] All quizzes from Blob exist in Postgres quizzes table
- [ ] All questions migrated with correct quiz foreign keys (MIG-02)
- [ ] All submissions migrated with correct quiz foreign keys (MIG-02)
- [ ] All participants migrated with correct quiz foreign keys (MIG-02)
- [ ] All answers migrated with correct participant and question foreign keys (MIG-02)
- [ ] Image URLs in database match original Blob URLs exactly (MIG-03)
- [ ] Timestamps converted correctly from ISO strings to database timestamps

## Tasks

<task id="1" description="Run the migration script">
Execute the migration script in the production/staging environment:

```bash
# Ensure environment variables are set
# BLOB_READ_WRITE_TOKEN - for reading Blob storage
# POSTGRES_URL - for writing to database

npm run migrate:blob-to-postgres
```

Record the output showing:
- Number of quizzes found in Blob
- Each quiz being migrated
- Final success/fail counts

**Expected output format:**
```
=== Blob to Postgres Migration ===

Loading quizzes from Vercel Blob...
Found N quiz files in Blob storage
  Loaded quiz: abc123 (Quiz Title)
  ...

Migrating quiz: abc123 (Quiz Title)
  Inserted quiz record
  Inserted M questions
  Inserted P participants with answers
  ...

=== Migration Complete ===
Total quizzes processed: N
Successful: N
Failed: 0
```
</task>

<task id="2" description="Verify record counts" depends_on="1">
Use Drizzle Studio or direct SQL queries to verify counts match expectations:

```bash
# Open Drizzle Studio
npm run db:studio
```

Or run SQL queries directly:

```sql
-- Count quizzes
SELECT COUNT(*) as quiz_count FROM quizzes;

-- Count questions per quiz
SELECT quiz_id, COUNT(*) as question_count
FROM questions
GROUP BY quiz_id;

-- Count participants per quiz
SELECT quiz_id, COUNT(*) as participant_count
FROM participants
GROUP BY quiz_id;

-- Count submissions per quiz
SELECT quiz_id, COUNT(*) as submission_count
FROM submissions
GROUP BY quiz_id;

-- Count answers per participant
SELECT participant_id, COUNT(*) as answer_count
FROM answers
GROUP BY participant_id;
```

Compare these counts against what the migration script reported.
</task>

<task id="3" description="Verify data integrity with spot checks" depends_on="1">
Select a few quizzes and verify the data matches:

**Check 1: Quiz metadata**
```sql
SELECT id, title, code, status, admin_pin, submission_token, created_at
FROM quizzes
LIMIT 3;
```
Verify:
- All fields populated correctly
- Status is one of: draft, collecting, active, closed
- created_at is a valid timestamp

**Check 2: Question data and image URLs**
```sql
SELECT q.id, q.quiz_id, q.image_url, q.answer, q."order"
FROM questions q
LIMIT 5;
```
Verify:
- image_url starts with expected Vercel Blob URL prefix
- order values are sequential starting from 0
- quiz_id references valid quiz

**Check 3: Submission image URLs**
```sql
SELECT s.id, s.quiz_id, s.name, s.image_url, s.created_at
FROM submissions s
LIMIT 5;
```
Verify:
- image_url starts with expected Vercel Blob URL prefix
- Names are preserved correctly

**Check 4: Participant-Answer relationships**
```sql
SELECT p.id, p.name, p.score, p.total, COUNT(a.id) as answer_count
FROM participants p
LEFT JOIN answers a ON a.participant_id = p.id
GROUP BY p.id, p.name, p.score, p.total
LIMIT 5;
```
Verify:
- answer_count equals total (or is close for partial attempts)
- Scores are within valid range

**Check 5: Foreign key integrity**
```sql
-- Should return 0 rows (no orphaned questions)
SELECT id FROM questions WHERE quiz_id NOT IN (SELECT id FROM quizzes);

-- Should return 0 rows (no orphaned participants)
SELECT id FROM participants WHERE quiz_id NOT IN (SELECT id FROM quizzes);

-- Should return 0 rows (no orphaned submissions)
SELECT id FROM submissions WHERE quiz_id NOT IN (SELECT id FROM quizzes);

-- Should return 0 rows (no orphaned answers)
SELECT id FROM answers
WHERE participant_id NOT IN (SELECT id FROM participants)
   OR question_id NOT IN (SELECT id FROM questions);
```
</task>

<task id="4" description="Test image URLs are accessible" depends_on="1">
Pick a few image URLs from the database and verify they're still accessible:

```bash
# Get a sample image URL from questions
curl -I "https://[blob-url-from-questions-table]"

# Get a sample image URL from submissions
curl -I "https://[blob-url-from-submissions-table]"
```

Both should return HTTP 200 OK and Content-Type: image/*.

This confirms:
- Image URLs were preserved correctly (MIG-03)
- Images are still accessible in Vercel Blob
</task>

<task id="5" description="Verify idempotent migration" depends_on="1">
Run the migration script a second time to verify idempotency:

```bash
npm run migrate:blob-to-postgres
```

Expected output should show quizzes being skipped:
```
Migrating quiz: abc123 (Quiz Title)
  Quiz abc123 already exists in Postgres, skipping
```

Verify:
- No duplicate records created
- Same total counts as before
- No errors on re-run
</task>

## Verification

1. **Migration succeeded**: Script completed with 0 failures
2. **Counts match**: All quiz/question/participant/submission/answer counts verified
3. **Foreign keys valid**: No orphaned records found in any table
4. **Image URLs work**: Sample URLs return HTTP 200
5. **Idempotent**: Re-running migration skips existing records safely
