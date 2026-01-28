---
wave: 1
depends_on: []
files_modified:
  - src/lib/store.ts
autonomous: true
---

# Plan 6.1: Core Quiz CRUD Operations

## Goal
Rewrite the core quiz CRUD methods in store.ts to use Drizzle/Postgres instead of Vercel Blob JSON, maintaining the exact same interface so API routes work without modification.

## Context
The store.ts file currently uses Vercel Blob to store quizzes as JSON files. Phase 5 established the Postgres database with Drizzle ORM. This plan migrates the foundational quiz operations:
- `createQuiz` - Insert a new quiz
- `getQuiz` - Fetch quiz by ID with all related data
- `getQuizByCode` - Fetch quiz by code
- `updateQuizStatus` - Update status with state machine validation

The key challenge is that the current interface returns nested objects (Quiz with embedded arrays), but Postgres stores these in separate tables. We'll use Drizzle's relational queries to reconstruct the nested structure.

## Interface Contract
The following interface must be preserved exactly (from current store.ts):

```typescript
interface Quiz {
  id: string
  title: string
  description?: string
  code: string
  status: 'draft' | 'collecting' | 'active' | 'closed'
  adminPin: string
  createdAt: string  // ISO string format
  questions: Question[]
  participants: Participant[]
  submissionToken?: string
  submissions: Submission[]
}

interface Question {
  id: string
  imageUrl: string
  answer: string
  order: number
}

interface Participant {
  id: string
  name: string
  score: number
  total: number
  timeTaken?: number
  createdAt: string
  answers: Answer[]
}

interface Answer {
  id: string
  questionId: string
  guess: string
  correct: boolean
}

interface Submission {
  id: string
  name: string
  imageUrl: string
  createdAt: string
}
```

## Tasks

<task id="6.1.1">
**Update imports and add helper functions**

Replace the Vercel Blob imports with Drizzle imports. Keep the `del` import from Blob for image deletion (still needed).

```typescript
// Remove these:
// import { put, list, del } from '@vercel/blob'

// Add these:
import { del } from '@vercel/blob'
import { db, quizzes, questions, participants, answers, submissions } from './db'
import { eq, and } from 'drizzle-orm'
```

Keep the existing interface definitions (`Quiz`, `Question`, `Participant`, `Answer`, `Submission`) as they define the contract.

Keep the `genId()` and `genCode()` helper functions unchanged.

Remove the `QUIZ_PREFIX`, `saveQuiz()`, `loadQuiz()`, and `loadAllQuizzes()` functions as they're Blob-specific.

Keep the `VALID_TRANSITIONS` map as it's used for status validation.
</task>

<task id="6.1.2">
**Add mapper functions to convert DB records to interface types**

The database schema uses different field names (snake_case in DB, camelCase in interface) and timestamps instead of ISO strings. Add mapper functions:

```typescript
// Convert database quiz record to interface Quiz with nested data
function mapQuizFromDb(
  quiz: typeof quizzes.$inferSelect,
  questionList: (typeof questions.$inferSelect)[],
  participantList: (typeof participants.$inferSelect & { answers: (typeof answers.$inferSelect)[] })[],
  submissionList: (typeof submissions.$inferSelect)[]
): Quiz {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? undefined,
    code: quiz.code,
    status: quiz.status,
    adminPin: quiz.adminPin,
    createdAt: quiz.createdAt.toISOString(),
    submissionToken: quiz.submissionToken ?? undefined,
    questions: questionList.map(q => ({
      id: q.id,
      imageUrl: q.imageUrl,
      answer: q.answer,
      order: q.order,
    })),
    participants: participantList.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      total: p.total,
      timeTaken: p.timeTaken ?? undefined,
      createdAt: p.createdAt.toISOString(),
      answers: p.answers.map(a => ({
        id: a.id,
        questionId: a.questionId,
        guess: a.guess,
        correct: a.correct,
      })),
    })),
    submissions: submissionList.map(s => ({
      id: s.id,
      name: s.name,
      imageUrl: s.imageUrl,
      createdAt: s.createdAt.toISOString(),
    })),
  }
}
```
</task>

<task id="6.1.3">
**Add helper to load full quiz with all relations**

Create a helper function that loads a quiz with all its nested data:

```typescript
async function loadQuizWithRelations(quizId: string): Promise<Quiz | null> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
    with: {
      questions: {
        orderBy: (q, { asc }) => [asc(q.order)],
      },
      participants: {
        with: {
          answers: true,
        },
      },
      submissions: {
        orderBy: (s, { asc }) => [asc(s.createdAt)],
      },
    },
  })

  if (!quiz) return null

  return mapQuizFromDb(
    quiz,
    quiz.questions,
    quiz.participants.map(p => ({ ...p, answers: p.answers })),
    quiz.submissions
  )
}
```
</task>

<task id="6.1.4">
**Rewrite createQuiz method**

Replace the existing `createQuiz` implementation:

```typescript
async createQuiz(title: string, description: string | undefined, adminPin: string): Promise<Quiz> {
  // Generate unique code
  let code = genCode()
  let existingQuiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.code, code),
  })
  while (existingQuiz) {
    code = genCode()
    existingQuiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.code, code),
    })
  }

  const id = genId()
  const now = new Date()

  await db.insert(quizzes).values({
    id,
    title,
    description: description ?? null,
    code,
    status: 'draft',
    adminPin,
    createdAt: now,
  })

  // Return the full Quiz object with empty arrays
  return {
    id,
    title,
    description,
    code,
    status: 'draft',
    adminPin,
    createdAt: now.toISOString(),
    questions: [],
    participants: [],
    submissions: [],
  }
}
```
</task>

<task id="6.1.5">
**Rewrite getQuiz method**

Replace with Drizzle query:

```typescript
async getQuiz(id: string): Promise<Quiz | null> {
  return loadQuizWithRelations(id)
}
```
</task>

<task id="6.1.6">
**Rewrite getQuizByCode method**

Replace with Drizzle query that finds by code then loads full quiz:

```typescript
async getQuizByCode(code: string): Promise<Quiz | null> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.code, code.toUpperCase()),
  })
  if (!quiz) return null
  return loadQuizWithRelations(quiz.id)
}
```
</task>

<task id="6.1.7">
**Rewrite updateQuizStatus method**

Replace with Drizzle update:

```typescript
async updateQuizStatus(id: string, status: Quiz['status']): Promise<Quiz | null> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, id),
  })
  if (!quiz) return null

  // Validate state transition
  const allowedTransitions = VALID_TRANSITIONS[quiz.status]
  if (!allowedTransitions.includes(status)) return null

  await db.update(quizzes)
    .set({ status })
    .where(eq(quizzes.id, id))

  return loadQuizWithRelations(id)
}
```
</task>

## Verification

1. Run `npx next build` to verify TypeScript compiles without errors
2. Verify store.ts imports from `./db` instead of using Blob for quiz data
3. Verify the Quiz interface is unchanged
4. Verify `createQuiz`, `getQuiz`, `getQuizByCode`, and `updateQuizStatus` methods are rewritten
5. Manually verify methods compile with correct types

## must_haves
- [ ] Store imports Drizzle db and schema (STORE-01)
- [ ] Interface types (Quiz, Question, Participant, Answer, Submission) preserved exactly (STORE-02)
- [ ] createQuiz inserts to quizzes table and returns Quiz object (STORE-01)
- [ ] getQuiz loads quiz with all relations from Postgres (STORE-01)
- [ ] getQuizByCode finds quiz by code from Postgres (STORE-01)
- [ ] updateQuizStatus validates transitions and updates Postgres (STORE-01)
- [ ] State transition validation logic preserved (STORE-02)
