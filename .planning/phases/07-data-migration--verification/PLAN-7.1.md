---
plan: "07.1"
title: "Migration Script Implementation"
wave: 1
depends_on: []
files_modified:
  - scripts/migrate-blob-to-postgres.ts
  - package.json
autonomous: true
---

# Plan 7.1: Migration Script Implementation

## Objective
Create a TypeScript migration script that reads all existing quiz data from Vercel Blob JSON storage and writes it to the Postgres database using Drizzle ORM.

## must_haves
- [ ] Migration script reads all `quiz-data/*.json` files from Vercel Blob (MIG-01)
- [ ] Migration script inserts quiz records into `quizzes` table preserving all fields (MIG-02)
- [ ] Migration script inserts questions, participants, answers, submissions with correct foreign keys (MIG-02)
- [ ] Image URLs in questions and submissions are preserved unchanged (MIG-03)
- [ ] Script handles empty arrays gracefully (no child records to insert)
- [ ] Script reports progress and any errors encountered
- [ ] npm script added to run migration

## Tasks

<task id="1" description="Create scripts directory and migration file">
Create the `scripts/` directory at the project root.

Create `scripts/migrate-blob-to-postgres.ts` with the basic structure:

```typescript
/**
 * Migration script: Vercel Blob JSON -> Postgres
 *
 * Reads all quiz data from Blob storage (quiz-data/*.json)
 * and inserts into Postgres tables using Drizzle ORM.
 *
 * Usage: npx tsx scripts/migrate-blob-to-postgres.ts
 *
 * Prerequisites:
 * - BLOB_READ_WRITE_TOKEN environment variable set
 * - POSTGRES_URL environment variable set
 */

import { list } from '@vercel/blob'
import { db, quizzes, questions, participants, answers, submissions } from '../src/lib/db'
import { eq } from 'drizzle-orm'

const QUIZ_PREFIX = 'quiz-data/'

// Type definitions matching the Blob JSON structure
interface BlobQuiz {
  id: string
  title: string
  description?: string
  code: string
  status: 'draft' | 'collecting' | 'active' | 'closed'
  adminPin: string
  createdAt: string
  questions: BlobQuestion[]
  participants: BlobParticipant[]
  submissionToken?: string
  submissions: BlobSubmission[]
}

interface BlobQuestion {
  id: string
  imageUrl: string
  answer: string
  order: number
}

interface BlobParticipant {
  id: string
  name: string
  score: number
  total: number
  timeTaken?: number
  createdAt: string
  answers: BlobAnswer[]
}

interface BlobAnswer {
  id: string
  questionId: string
  guess: string
  correct: boolean
}

interface BlobSubmission {
  id: string
  name: string
  imageUrl: string
  createdAt: string
}
```
</task>

<task id="2" description="Implement Blob reading function" depends_on="1">
Add the function to read all quizzes from Vercel Blob:

```typescript
async function loadAllQuizzesFromBlob(): Promise<BlobQuiz[]> {
  console.log('Loading quizzes from Vercel Blob...')

  const { blobs } = await list({ prefix: QUIZ_PREFIX })
  console.log(`Found ${blobs.length} quiz files in Blob storage`)

  const quizzes: BlobQuiz[] = []

  for (const blob of blobs) {
    try {
      // Add cache buster to avoid stale CDN reads
      const url = new URL(blob.url)
      url.searchParams.set('_t', Date.now().toString())

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      })

      if (res.ok) {
        const quiz = await res.json() as BlobQuiz
        quizzes.push(quiz)
        console.log(`  Loaded quiz: ${quiz.id} (${quiz.title})`)
      } else {
        console.error(`  Failed to load ${blob.pathname}: ${res.status}`)
      }
    } catch (error) {
      console.error(`  Error loading ${blob.pathname}:`, error)
    }
  }

  console.log(`Successfully loaded ${quizzes.length} quizzes`)
  return quizzes
}
```
</task>

<task id="3" description="Implement single quiz migration function" depends_on="1">
Add the function to migrate a single quiz and all its related data:

```typescript
async function migrateQuiz(quiz: BlobQuiz): Promise<boolean> {
  console.log(`\nMigrating quiz: ${quiz.id} (${quiz.title})`)

  try {
    // Check if quiz already exists (idempotent migration)
    const existing = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quiz.id),
    })

    if (existing) {
      console.log(`  Quiz ${quiz.id} already exists in Postgres, skipping`)
      return true
    }

    // Insert quiz record
    await db.insert(quizzes).values({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description ?? null,
      code: quiz.code,
      status: quiz.status,
      adminPin: quiz.adminPin,
      submissionToken: quiz.submissionToken ?? null,
      createdAt: new Date(quiz.createdAt),
    })
    console.log(`  Inserted quiz record`)

    // Insert questions (preserve image URLs)
    if (quiz.questions.length > 0) {
      for (const q of quiz.questions) {
        await db.insert(questions).values({
          id: q.id,
          quizId: quiz.id,
          imageUrl: q.imageUrl,  // MIG-03: Preserve image URL
          answer: q.answer,
          order: q.order,
        })
      }
      console.log(`  Inserted ${quiz.questions.length} questions`)
    }

    // Insert submissions (preserve image URLs)
    if (quiz.submissions.length > 0) {
      for (const s of quiz.submissions) {
        await db.insert(submissions).values({
          id: s.id,
          quizId: quiz.id,
          name: s.name,
          imageUrl: s.imageUrl,  // MIG-03: Preserve image URL
          createdAt: new Date(s.createdAt),
        })
      }
      console.log(`  Inserted ${quiz.submissions.length} submissions`)
    }

    // Insert participants and their answers
    if (quiz.participants.length > 0) {
      for (const p of quiz.participants) {
        await db.insert(participants).values({
          id: p.id,
          quizId: quiz.id,
          name: p.name,
          score: p.score,
          total: p.total,
          timeTaken: p.timeTaken ?? null,
          createdAt: new Date(p.createdAt),
        })

        // Insert answers for this participant
        if (p.answers.length > 0) {
          for (const a of p.answers) {
            await db.insert(answers).values({
              id: a.id,
              participantId: p.id,
              questionId: a.questionId,
              guess: a.guess,
              correct: a.correct,
            })
          }
        }
      }
      console.log(`  Inserted ${quiz.participants.length} participants with answers`)
    }

    return true
  } catch (error) {
    console.error(`  Error migrating quiz ${quiz.id}:`, error)
    return false
  }
}
```
</task>

<task id="4" description="Implement main migration function" depends_on="2,3">
Add the main entry point that orchestrates the migration:

```typescript
async function main() {
  console.log('=== Blob to Postgres Migration ===\n')

  // Load all quizzes from Blob
  const blobQuizzes = await loadAllQuizzesFromBlob()

  if (blobQuizzes.length === 0) {
    console.log('\nNo quizzes found in Blob storage. Nothing to migrate.')
    return
  }

  // Migrate each quiz
  let successCount = 0
  let failCount = 0

  for (const quiz of blobQuizzes) {
    const success = await migrateQuiz(quiz)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  // Summary
  console.log('\n=== Migration Complete ===')
  console.log(`Total quizzes processed: ${blobQuizzes.length}`)
  console.log(`Successful: ${successCount}`)
  console.log(`Failed: ${failCount}`)

  if (failCount > 0) {
    console.error('\nSome quizzes failed to migrate. Review errors above.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
```
</task>

<task id="5" description="Add npm script and tsx dependency" depends_on="1">
Update `package.json` to add the migration script and tsx (TypeScript executor):

1. Add `tsx` as a dev dependency if not present:
```json
{
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

2. Add the migration script:
```json
{
  "scripts": {
    "migrate:blob-to-postgres": "npx tsx scripts/migrate-blob-to-postgres.ts"
  }
}
```

Run `npm install` after updating package.json.
</task>

## Verification

1. **TypeScript compiles**: Run `npx tsc --noEmit scripts/migrate-blob-to-postgres.ts` (or build succeeds)
2. **Script structure**: Verify script imports from `@vercel/blob` and `../src/lib/db`
3. **npm script exists**: Verify `npm run migrate:blob-to-postgres` is available
4. **Dry run check**: Run `npm run migrate:blob-to-postgres` in a dev environment (may need env vars)

Note: Actual data migration happens in Plan 7.2.
