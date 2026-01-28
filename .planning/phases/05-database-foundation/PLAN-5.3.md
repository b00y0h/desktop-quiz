---
wave: 3
depends_on: ["5.2"]
files_modified: []
autonomous: false
---

# Plan 5.3: Push Schema to Database and Verify

## Goal
Push the Drizzle schema to the Vercel Postgres database and verify the tables are created correctly, completing the database foundation phase.

## Context
Plans 5.1 and 5.2 set up Drizzle ORM configuration and defined the schema. Now we need to:
1. Ensure the database connection works
2. Push the schema to create the tables
3. Verify the tables exist with correct structure

## Prerequisites
- Vercel Postgres database provisioned via Vercel dashboard
- Environment variables set: `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`
- Plans 5.1 and 5.2 completed

## Tasks

<task id="5.3.1">
**Verify database connection**

Test that the database connection works by running a simple query. Create a temporary test script or use Drizzle Studio:

```bash
# Option 1: Use Drizzle Studio to verify connection
npm run db:studio
```

If the connection works, Drizzle Studio will open and show an empty database. If it fails, you'll see a connection error.

Alternative: Create a quick test in Node:
```bash
npx tsx -e "
import { sql } from '@vercel/postgres';
const result = await sql\`SELECT NOW()\`;
console.log('Connected! Server time:', result.rows[0].now);
"
```
</task>

<task id="5.3.2">
**Push schema to database**

Run the Drizzle push command to create all tables:

```bash
npm run db:push
```

This will:
- Read the schema from `src/lib/db/schema.ts`
- Generate SQL to create the quiz_status enum and all 5 tables
- Execute the SQL against the database
- Report success or any errors

Expected output should show creation of:
- `quiz_status` enum
- `quizzes` table
- `questions` table
- `participants` table
- `answers` table
- `submissions` table
</task>

<task id="5.3.3">
**Verify tables created correctly**

After schema push, verify the tables exist with correct structure:

```bash
# Open Drizzle Studio to inspect tables
npm run db:studio
```

In Drizzle Studio, verify:
1. All 5 tables exist (quizzes, questions, participants, answers, submissions)
2. Each table has the expected columns
3. Foreign key relationships are visible
4. The quiz_status enum exists with values: draft, collecting, active, closed

Alternative SQL verification (via Vercel dashboard SQL console):
```sql
-- List all tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Check quizzes table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quizzes';

-- Check enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'quiz_status');
```
</task>

<task id="5.3.4">
**Test a simple insert/select cycle**

Verify the database is fully operational by inserting and reading a test record:

```bash
npx tsx -e "
import { db, quizzes } from './src/lib/db';

// Insert test quiz
const testQuiz = {
  id: 'test-' + Date.now(),
  title: 'Test Quiz',
  code: 'TEST01',
  status: 'draft' as const,
  adminPin: '1234',
};

await db.insert(quizzes).values(testQuiz);
console.log('Inserted:', testQuiz.id);

// Read it back
const result = await db.select().from(quizzes).where(eq(quizzes.id, testQuiz.id));
console.log('Read back:', result[0]);

// Clean up
import { eq } from 'drizzle-orm';
await db.delete(quizzes).where(eq(quizzes.id, testQuiz.id));
console.log('Cleaned up test data');
"
```

If this succeeds, the database foundation is complete and ready for the store migration in Phase 6.
</task>

## Verification

1. `npm run db:push` completes without errors
2. Drizzle Studio shows all 5 tables with correct columns
3. Foreign key relationships are properly established
4. Test insert/select/delete cycle works
5. `npx next build` still compiles successfully

## must_haves
- [ ] Database connection works (DB-01)
- [ ] Schema push creates all 5 tables (DB-03)
- [ ] quiz_status enum created with correct values (DB-03)
- [ ] Foreign key constraints are in place (DB-03)
- [ ] Basic CRUD operations work (DB-01, DB-03)
