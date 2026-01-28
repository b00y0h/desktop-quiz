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
 *   - Uses cache-busting to avoid stale CDN reads from Blob
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

async function loadAllQuizzesFromBlob(): Promise<BlobQuiz[]> {
  console.log('Loading quizzes from Vercel Blob...')

  const { blobs } = await list({ prefix: QUIZ_PREFIX })
  console.log(`Found ${blobs.length} quiz files in Blob storage`)

  const loadedQuizzes: BlobQuiz[] = []

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
        loadedQuizzes.push(quiz)
        console.log(`  Loaded quiz: ${quiz.id} (${quiz.title})`)
      } else {
        console.error(`  Failed to load ${blob.pathname}: ${res.status}`)
      }
    } catch (error) {
      console.error(`  Error loading ${blob.pathname}:`, error)
    }
  }

  console.log(`Successfully loaded ${loadedQuizzes.length} quizzes`)
  return loadedQuizzes
}

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
    if (quiz.questions && quiz.questions.length > 0) {
      for (const q of quiz.questions) {
        await db.insert(questions).values({
          id: q.id,
          quizId: quiz.id,
          imageUrl: q.imageUrl, // MIG-03: Preserve image URL
          answer: q.answer,
          order: q.order,
        })
      }
      console.log(`  Inserted ${quiz.questions.length} questions`)
    }

    // Insert submissions (preserve image URLs)
    if (quiz.submissions && quiz.submissions.length > 0) {
      for (const s of quiz.submissions) {
        await db.insert(submissions).values({
          id: s.id,
          quizId: quiz.id,
          name: s.name,
          imageUrl: s.imageUrl, // MIG-03: Preserve image URL
          createdAt: new Date(s.createdAt),
        })
      }
      console.log(`  Inserted ${quiz.submissions.length} submissions`)
    }

    // Insert participants and their answers
    if (quiz.participants && quiz.participants.length > 0) {
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
        if (p.answers && p.answers.length > 0) {
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
